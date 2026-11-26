import {
  type Brief,
  ResearchOutput,
  type ResearchSource,
  type SourceOrigin,
} from '@ai-post-recipe/shared'

import { logger } from '../../lib/logger.js'
import type { Phase, PhaseContext } from './phase.js'

/** At most this many pages are read per run. */
export const MAX_SOURCES = 12
const RESULTS_PER_QUERY = 4
const CONCURRENCY = 4
const TEXT_LIMIT = 6000
const EXCERPT_LIMIT = 300

/** Pages behind a login or built by scripts; the uploaded screenshots cover them. */
const SOCIAL =
  /(^|\.)(instagram|facebook|tiktok|youtube|x|twitter|linkedin|pinterest)\.com$/i

interface Candidate {
  url: string
  title: string
  origin: SourceOrigin
}

/** Same page: no hash, no trailing slash, lower-case host. */
export function normalizeUrl(raw: string) {
  try {
    const url = new URL(raw)
    url.hash = ''
    const path = url.pathname.replace(/\/+$/, '')
    return `${url.protocol}//${url.host.toLowerCase()}${path}${url.search}`
  } catch {
    return raw.trim()
  }
}

/**
 * The page without its query: search results often list one product page
 * several times with review or sort parameters.
 */
const pageKey = (raw: string) => normalizeUrl(raw).split('?')[0] ?? raw

const TRACKING = /^(utm_\w+|srsltid|gclid|fbclid|msclkid)$/i

/** The URL without tracking parameters that search results carry. */
export function withoutTracking(raw: string) {
  try {
    const url = new URL(raw)
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING.test(key)) url.searchParams.delete(key)
    }
    return url.toString()
  } catch {
    return raw
  }
}

const hostOf = (raw: string) => {
  try {
    return new URL(raw).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

const isSocial = (url: string) => {
  try {
    return SOCIAL.test(new URL(url).hostname)
  } catch {
    return false
  }
}

/** The brand name alone, then with each of the first two products. */
export function searchQueries(brief: Brief) {
  return [
    brief.brandName,
    ...brief.products.slice(0, 2).map((p) => `${brief.brandName} ${p.name}`),
  ]
}

async function findCandidates({ brief, search }: PhaseContext) {
  const candidates: Array<Candidate> = [
    ...brief.links.map((l) => ({
      url: l.url,
      title: '',
      origin: 'BRIEF' as const,
    })),
    ...brief.products.flatMap((p) =>
      p.url ? [{ url: p.url, title: p.name, origin: 'BRIEF' as const }] : [],
    ),
  ]

  // The brand's own sites: their search results come before third-party pages.
  const official = new Set(candidates.map((c) => hostOf(c.url)))
  const found: Array<Candidate> = []

  const queries = search.name === 'none' ? [] : searchQueries(brief)
  for (const query of queries) {
    try {
      const results = await search.search(query, {
        language: brief.language,
        country: brief.language === 'hr' ? 'hr' : undefined,
        limit: RESULTS_PER_QUERY,
      })
      found.push(
        ...results
          .filter((r) => !isSocial(r.url))
          .map((r) => ({
            url: withoutTracking(r.url),
            title: r.title,
            origin: 'SEARCH' as const,
          })),
      )
    } catch (error) {
      // Research goes on with the brief's links.
      logger.warn({ query, err: error }, 'Search failed')
    }
  }

  const isOfficial = (c: Candidate) => official.has(hostOf(c.url))
  candidates.push(
    ...found.filter(isOfficial),
    ...found.filter((c) => !isOfficial(c)),
  )

  const seen = new Set<string>()
  const unique = candidates.filter((c) => {
    const key = pageKey(c.url)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return { queries, candidates: unique.slice(0, MAX_SOURCES) }
}

async function read(
  ctx: PhaseContext,
  candidate: Candidate,
): Promise<ResearchSource> {
  const fetchedAt = new Date().toISOString()
  if (isSocial(candidate.url)) {
    return {
      ...candidate,
      excerpt: '',
      text: '',
      reachable: false,
      error: 'Social network page; the uploaded screenshots are used instead',
      fetchedAt,
    }
  }
  const page = await ctx.fetcher.fetchPage(candidate.url)
  const text = page.text.slice(0, TEXT_LIMIT)
  return {
    url: candidate.url,
    title: page.title || candidate.title || candidate.url,
    excerpt: (page.description || text).slice(0, EXCERPT_LIMIT),
    text,
    reachable: page.reachable,
    error: page.error,
    origin: candidate.origin,
    fetchedAt,
  }
}

/** Runs `task` over `items`, at most `limit` at a time, keeping the order. */
async function mapLimited<T, R>(
  items: Array<T>,
  limit: number,
  task: (item: T) => Promise<R>,
) {
  const results: Array<R> = new Array<R>(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await task(items[index])
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  )
  return results
}

/**
 * Collects the brand's official pages: the brief's links and product pages,
 * plus web search results when a search key is set. Every page is fetched and
 * kept, readable or not, so the analysis can name unavailable sources.
 */
export const researchPhase: Phase<'RESEARCH'> = {
  key: 'RESEARCH',
  outputSchema: ResearchOutput,
  execute: async (ctx) => {
    const { queries, candidates } = await findCandidates(ctx)
    const sources = await mapLimited(candidates, CONCURRENCY, (c) =>
      read(ctx, c),
    )
    return { output: { sources, queries } }
  },
}

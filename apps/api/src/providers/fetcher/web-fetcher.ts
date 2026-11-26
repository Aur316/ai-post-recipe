import { isIP } from 'node:net'

import { htmlToText } from './html-text.js'
import { parseRobots } from './robots.js'

export interface FetchedPage {
  url: string
  title: string
  description: string
  text: string
  reachable: boolean
  error: string | null
}

export interface PageFetcher {
  fetchPage(url: string): Promise<FetchedPage>
}

export interface WebFetcherOptions {
  fetch?: typeof fetch
  timeoutMs?: number
  maxBytes?: number
  userAgent?: string
}

const MAX_REDIRECTS = 5
const TEXT_TYPES = /^(text\/html|application\/xhtml\+xml|text\/plain)/i

const PRIVATE_V4 = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
]

export function isPublicUrl(raw: string) {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return false
  }
  if (isIP(host) === 4) return !PRIVATE_V4.some((r) => r.test(host))
  if (isIP(host) === 6)
    return !(
      host === '::1' ||
      host === '::' ||
      /^f[cd]/.test(host) ||
      host.startsWith('fe80')
    )
  return true
}

export class WebFetcher implements PageFetcher {
  private readonly fetchFn: typeof fetch
  private readonly timeoutMs: number
  private readonly maxBytes: number
  private readonly userAgent: string
  private readonly robots = new Map<
    string,
    Promise<(path: string) => boolean>
  >()

  constructor(options: WebFetcherOptions = {}) {
    this.fetchFn = options.fetch ?? globalThis.fetch
    this.timeoutMs = options.timeoutMs ?? 10_000
    this.maxBytes = options.maxBytes ?? 2_000_000
    this.userAgent = options.userAgent ?? 'AIPostRecipe/1.0 (brand research)'
  }

  async fetchPage(url: string): Promise<FetchedPage> {
    const failed = (error: string): FetchedPage => ({
      url,
      title: '',
      description: '',
      text: '',
      reachable: false,
      error,
    })

    try {
      let current = url
      for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        if (!isPublicUrl(current)) return failed('Not a public http(s) address')
        if (!(await this.allowed(current)))
          return failed('Blocked by robots.txt')

        const response = await this.fetchFn(current, {
          headers: {
            'User-Agent': this.userAgent,
            Accept: 'text/html,application/xhtml+xml,text/plain',
          },
          redirect: 'manual',
          signal: AbortSignal.timeout(this.timeoutMs),
        })

        const location = response.headers.get('location')
        if (response.status >= 300 && response.status < 400 && location) {
          current = new URL(location, current).toString()
          continue
        }
        if (!response.ok) return failed(`HTTP ${response.status}`)

        const type = response.headers.get('content-type') ?? ''
        if (!TEXT_TYPES.test(type))
          return failed(
            `Not a web page (${type.split(';')[0] || 'unknown type'})`,
          )

        const body = await this.readText(response, type)
        const content = type.startsWith('text/plain')
          ? { title: '', description: '', text: body.trim() }
          : htmlToText(body)
        return { url, ...content, reachable: true, error: null }
      }
      return failed('Too many redirects')
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError')
        return failed('Timed out')
      return failed(error instanceof Error ? error.message : String(error))
    }
  }

  private allowed(url: string) {
    const { origin, pathname, search } = new URL(url)
    let check = this.robots.get(origin)
    if (!check) {
      check = this.loadRobots(origin)
      this.robots.set(origin, check)
    }
    return check.then((isAllowed) => isAllowed(pathname + search))
  }

  private async loadRobots(origin: string) {
    try {
      const response = await this.fetchFn(`${origin}/robots.txt`, {
        headers: { 'User-Agent': this.userAgent },
        signal: AbortSignal.timeout(this.timeoutMs),
      })
      if (response.status >= 500) return () => false
      if (!response.ok) return () => true
      return parseRobots(await response.text(), this.userAgent)
    } catch {
      return () => true
    }
  }

  private async readText(response: Response, type: string) {
    const charset = /charset=([\w-]+)/i.exec(type)?.[1] ?? 'utf-8'
    if (!response.body) return ''
    const chunks: Array<Uint8Array> = []
    let size = 0
    for await (const chunk of response.body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk)
      size += chunk.length
      if (size >= this.maxBytes) break
    }
    const bytes = Buffer.concat(chunks)
    try {
      return new TextDecoder(charset).decode(bytes)
    } catch {
      return new TextDecoder('utf-8').decode(bytes)
    }
  }
}

import { zipSync } from 'fflate'

import type { Db } from '../../db/prisma.js'
import { ConflictError, NotFoundError } from '../../lib/errors.js'
import type { StorageProvider } from '../../providers/storage/storage.provider.js'
import { AssetRepo } from '../../repositories/asset/asset.repo.js'
import { PhaseRunRepo } from '../../repositories/phase-run/phase-run.repo.js'
import { PostRepo, toSlides } from '../../repositories/post/post.repo.js'
import { RunRepo } from '../../repositories/run/run.repo.js'
import { SourceRepo } from '../../repositories/source/source.repo.js'

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`
const text = (value: string) => new TextEncoder().encode(value)

export const slugify = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'run'

export class ExportService {
  constructor(
    private readonly db: Db,
    private readonly storage: StorageProvider,
  ) {}

  async build(runId: string) {
    const run = await new RunRepo(this.db).findById(runId)
    if (!run) throw new NotFoundError('Run', runId)
    const phaseRuns = new PhaseRunRepo(this.db)
    const [posts, sources, phases, assets, usage] = await Promise.all([
      new PostRepo(this.db).listByRun(runId),
      new SourceRepo(this.db).listByRun(runId),
      phaseRuns.latestByRun(runId),
      new AssetRepo(this.db).listByRun(runId),
      phaseRuns.usageByPhase(runId),
    ])
    if (posts.length === 0) {
      throw new ConflictError('NOTHING_TO_EXPORT', 'The run has no posts yet')
    }

    const files: Record<string, Uint8Array> = {}
    files['brief.json'] = text(json(run.brief))

    for (const post of posts) {
      const dir = `post-${post.index}-${post.format.toLowerCase()}`
      const slides = toSlides(post.slides)
      for (const slide of slides) {
        const asset = assets.find((a) => a.id === slide.assetId)
        if (asset) {
          files[`${dir}/slide-${slide.order}.png`] = await this.read(
            asset.storageKey,
          )
        }
      }
      files[`${dir}/caption.txt`] = text(
        `${post.caption ?? ''}\n\n${post.hashtags.join(' ')}\n`,
      )
      files[`${dir}/meta.json`] = text(
        json({
          post: post.index,
          format: post.format,
          goal: post.goal,
          concept: post.concept,
          rationale: post.rationale,
          product: post.product,
          slides: slides.map((s) => ({
            order: s.order,
            text: s.text,
            file: s.assetId ? `slide-${s.order}.png` : null,
          })),
        }),
      )
    }

    files['sources.md'] = text(
      [
        `# Sources for ${run.brandName}`,
        '',
        ...sources.map(
          (s) =>
            `- ${s.reachable ? 'Read' : `**Could not be read** (${s.error ?? 'unknown'})`} · ${s.origin === 'SEARCH' ? 'web search' : 'brief'} · [${s.title || s.url}](${s.url})`,
        ),
        '',
      ].join('\n'),
    )

    phases.forEach((p) => {
      files[
        `phases/${String(phaseNumber(p.phase)).padStart(2, '0')}-${p.phase.toLowerCase()}.json`
      ] = text(
        json({
          phase: p.phase,
          status: p.status,
          attempt: p.attempt,
          promptId: p.promptId,
          model: p.model,
          tokensIn: p.tokensIn,
          tokensOut: p.tokensOut,
          costUsd: p.costUsd === null ? null : Number(p.costUsd),
          output: p.output,
          editedOutput: p.editedOutput,
        }),
      )
    })

    files['README.md'] = text(readme(run.brandName, posts, usage))
    const fileName = `${slugify(run.brandName)}-posts.zip`
    return {
      data: Buffer.from(zipSync(files, { level: 6 })),
      files: Object.keys(files).length,
      fileName,
    }
  }

  private async read(key: string) {
    const { body } = await this.storage.get(key)
    const chunks: Array<Buffer> = []
    for await (const chunk of body)
      chunks.push(Buffer.from(chunk as Uint8Array))
    return new Uint8Array(Buffer.concat(chunks))
  }
}

const ORDER = [
  'BRIEF',
  'RESEARCH',
  'ANALYSIS',
  'PLAN',
  'COPY',
  'VISUALS',
  'REVIEW',
  'EXPORT',
]
const phaseNumber = (phase: string) => ORDER.indexOf(phase) + 1

interface UsageRow {
  phase: string
  attempts: number
  costUsd: number
  tokensIn: number
  tokensOut: number
}

const usd = (n: number) => `$${n.toFixed(4)}`
const count = (n: number) => n.toLocaleString('en-US')

function usageTable(rows: Array<UsageRow>) {
  const total = rows.reduce(
    (t, r) => ({
      attempts: t.attempts + r.attempts,
      costUsd: t.costUsd + r.costUsd,
      tokensIn: t.tokensIn + r.tokensIn,
      tokensOut: t.tokensOut + r.tokensOut,
    }),
    { attempts: 0, costUsd: 0, tokensIn: 0, tokensOut: 0 },
  )
  return [
    '## Usage',
    '',
    'Every attempt counts, including re-runs and regenerated slides.',
    '',
    '| Phase | Attempts | Input tokens | Output tokens | Cost |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...rows.map(
      (r) =>
        `| ${r.phase.toLowerCase()} | ${r.attempts} | ${count(r.tokensIn)} | ${count(r.tokensOut)} | ${usd(r.costUsd)} |`,
    ),
    `| **Total** | ${total.attempts} | ${count(total.tokensIn)} | ${count(total.tokensOut)} | **${usd(total.costUsd)}** |`,
    '',
  ]
}

function readme(
  brand: string,
  posts: Array<{
    index: number
    format: string
    goal: string
    product: string
  }>,
  usage: Array<UsageRow>,
) {
  return [
    `# ${brand}: three Instagram posts`,
    '',
    'Made with AI Post Recipe.',
    '',
    '| Post | Format | Goal | Product | Folder |',
    '| --- | --- | --- | --- | --- |',
    ...posts.map(
      (p) =>
        `| ${p.index} | ${p.format.toLowerCase()} | ${p.goal} | ${p.product} | post-${p.index}-${p.format.toLowerCase()}/ |`,
    ),
    '',
    'Each post folder has the slides in order (`slide-1.png` …), `caption.txt` (caption and hashtags) and `meta.json` (format, goal, concept, rationale, slide texts).',
    '`sources.md` lists every source the research phase read, or could not read and why.',
    '`phases/` holds the output of every phase with the prompt id, model, tokens and cost; `editedOutput` is the version a person approved.',
    '',
    ...usageTable(usage),
  ].join('\n')
}

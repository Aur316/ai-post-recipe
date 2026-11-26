import { z } from 'zod'

export const PostFormat = z.enum(['IMAGE', 'CAROUSEL', 'STORY'])
export type PostFormat = z.infer<typeof PostFormat>

/** The eight phases of the recipe, in order. */
export const PhaseKey = z.enum([
  'BRIEF',
  'RESEARCH',
  'ANALYSIS',
  'PLAN',
  'COPY',
  'VISUALS',
  'REVIEW',
  'EXPORT',
])
export type PhaseKey = z.infer<typeof PhaseKey>

export const PHASE_ORDER = PhaseKey.options

/** Phases after which the run waits for a person to approve or edit the result. */
export const APPROVAL_PHASES: ReadonlyArray<PhaseKey> = ['ANALYSIS', 'PLAN']

export const PhaseStatus = z.enum([
  'PENDING',
  'RUNNING',
  'AWAITING_APPROVAL',
  'APPROVED',
  'DONE',
  'FAILED',
  'STALE',
])
export type PhaseStatus = z.infer<typeof PhaseStatus>

/**
 * Phase outputs. Visuals, review and export are placeholders until M7–M8.
 * AI outputs use `nullable` rather than `optional`, because structured output
 * needs every field in the JSON schema.
 */
export const BriefOutput = z.object({ accepted: z.literal(true) })

/** Where a source came from: a link in the brief, or a web search. */
export const SourceOrigin = z.enum(['BRIEF', 'SEARCH'])
export type SourceOrigin = z.infer<typeof SourceOrigin>

export const ResearchSource = z.object({
  url: z.string(),
  title: z.string(),
  /** The start of the page's text; the analysis reads up to `text`. */
  excerpt: z.string(),
  /** Clean page text, shortened; empty when the page could not be read. */
  text: z.string(),
  reachable: z.boolean(),
  /** Why the page could not be read, e.g. "HTTP 404" or "Blocked by robots.txt". */
  error: z.string().nullable(),
  origin: SourceOrigin,
  fetchedAt: z.iso.datetime(),
})
export type ResearchSource = z.infer<typeof ResearchSource>

export const ResearchOutput = z.object({
  sources: z.array(ResearchSource),
  /** The search queries that were run; empty without a search key. */
  queries: z.array(z.string()),
})

export const Claim = z
  .object({
    text: z.string().min(1),
    status: z.enum(['verified', 'assumption']),
    sourceUrl: z.string().nullable(),
    /** A short quote from the source that supports a verified claim. */
    evidence: z.string().nullable(),
  })
  .refine((c) => c.status === 'assumption' || !!c.sourceUrl, {
    message: 'A verified claim needs a sourceUrl',
    path: ['sourceUrl'],
  })
export type Claim = z.infer<typeof Claim>

export const AnalysisOutput = z.object({
  summary: z.string(),
  tone: z.string(),
  audience: z.string(),
  themes: z.array(z.string()),
  visualStyle: z.string(),
  colors: z.array(
    z.object({
      hex: z.string().regex(/^#[0-9a-f]{6}$/i, 'A hex colour like #FF6600'),
      name: z.string(),
      usage: z.string(),
    }),
  ),
  productPresentation: z.string(),
  peoplePresentation: z.string(),
  claims: z.array(Claim),
  /** What could not be found or verified, including unreachable sources. */
  gaps: z.array(z.string()),
})
export type AnalysisOutput = z.infer<typeof AnalysisOutput>

export const PlanOutput = z.object({
  posts: z
    .array(
      z.object({
        index: z.number().int().min(1).max(3),
        format: PostFormat,
        goal: z.string(),
        concept: z.string(),
        rationale: z.string(),
        product: z.string(),
      }),
    )
    .length(3),
})

export const PostCopy = z.object({
  index: z.number().int().min(1).max(3),
  caption: z.string().min(1),
  hashtags: z.array(z.string()),
  slides: z
    .array(
      z.object({ order: z.number().int().min(1), text: z.string().min(1) }),
    )
    .min(1),
})
export type PostCopy = z.infer<typeof PostCopy>

/** What the copy model writes: one entry per planned post. */
export const CopyDraft = z.object({ posts: z.array(PostCopy).length(3) })

/**
 * A number or quote in the copy that no source contains. Found by a fixed
 * check after the model has answered, not by the model.
 */
export const UnsupportedFact = z.object({
  postIndex: z.number().int(),
  /** `caption`, or the slide's order number. */
  place: z.union([z.literal('caption'), z.number().int()]),
  kind: z.enum(['number', 'quote']),
  value: z.string(),
  /** The words around it, to find it quickly. */
  context: z.string(),
})
export type UnsupportedFact = z.infer<typeof UnsupportedFact>

export const CopyOutput = CopyDraft.extend({
  unsupported: z.array(UnsupportedFact),
})

/** One rendered slide: the PNG and the AI background it was drawn on. */
export const RenderedSlide = z.object({
  postIndex: z.number().int(),
  order: z.number().int(),
  assetId: z.string(),
  backgroundAssetId: z.string(),
})
export type RenderedSlide = z.infer<typeof RenderedSlide>

export const VisualsOutput = z.object({ slides: z.array(RenderedSlide) })

/** What the vision model reports for one slide. */
export const SlideCheck = z.object({
  postIndex: z.number().int(),
  order: z.number().int(),
  passed: z.boolean(),
  /** Short, concrete problems, e.g. "text overlaps the product". */
  issues: z.array(z.string()),
})
export type SlideCheck = z.infer<typeof SlideCheck>

/** What the review model writes. */
export const ReviewDraft = z.object({ slides: z.array(SlideCheck) })

export const ReviewOutput = z.object({
  /** Share of slides that passed, 0–1, after the regenerated ones were checked again. */
  score: z.number().min(0).max(1),
  slides: z.array(
    SlideCheck.extend({
      /** Rule checks (size, missing image) rather than the model. */
      ruleIssues: z.array(z.string()),
      /** The slide failed and was made again once, with its issues as the instruction. */
      regenerated: z.boolean(),
    }),
  ),
  /** Run-wide findings: numbers or quotes in the text that no source contains. */
  issues: z.array(z.string()),
  /** Slides that were made again; they replace the earlier PNGs on the posts. */
  replaced: z.array(RenderedSlide),
})
export type ReviewOutput = z.infer<typeof ReviewOutput>

export const ExportOutput = z.object({
  /** The ZIP as built when the phase ran; GET /export always builds a fresh one. */
  assetId: z.string(),
  files: z.number().int(),
})

export const PHASE_OUTPUT_SCHEMAS = {
  BRIEF: BriefOutput,
  RESEARCH: ResearchOutput,
  ANALYSIS: AnalysisOutput,
  PLAN: PlanOutput,
  COPY: CopyOutput,
  VISUALS: VisualsOutput,
  REVIEW: ReviewOutput,
  EXPORT: ExportOutput,
} satisfies Record<PhaseKey, z.ZodType>

export type PhaseOutputs = {
  [K in PhaseKey]: z.infer<(typeof PHASE_OUTPUT_SCHEMAS)[K]>
}

/** The latest attempt of a phase, as the API returns it. */
export const PhaseRunDto = z.object({
  id: z.uuid(),
  phase: PhaseKey,
  attempt: z.number().int(),
  status: PhaseStatus,
  output: z.unknown().nullable(),
  editedOutput: z.unknown().nullable(),
  promptId: z.string().nullable(),
  model: z.string().nullable(),
  tokensIn: z.number().int().nullable(),
  tokensOut: z.number().int().nullable(),
  costUsd: z.number().nullable(),
  error: z.string().nullable(),
  startedAt: z.iso.datetime().nullable(),
  finishedAt: z.iso.datetime().nullable(),
})
export type PhaseRunDto = z.infer<typeof PhaseRunDto>

export const PhaseParams = z.object({ id: z.uuid(), phase: PhaseKey })

export const ApprovePhaseBody = z.object({
  editedOutput: z.unknown().optional(),
})
export type ApprovePhaseBody = z.infer<typeof ApprovePhaseBody>

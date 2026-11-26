import { z } from 'zod'

export const PostFormat = z.enum(['IMAGE', 'CAROUSEL', 'STORY'])
export type PostFormat = z.infer<typeof PostFormat>

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

export const BriefOutput = z.object({ accepted: z.literal(true) })

export const SourceOrigin = z.enum(['BRIEF', 'SEARCH'])
export type SourceOrigin = z.infer<typeof SourceOrigin>

export const ResearchSource = z.object({
  url: z.string(),
  title: z.string(),
  excerpt: z.string(),
  text: z.string(),
  reachable: z.boolean(),
  error: z.string().nullable(),
  origin: SourceOrigin,
  fetchedAt: z.iso.datetime(),
})
export type ResearchSource = z.infer<typeof ResearchSource>

export const WebsiteCapture = z.object({
  url: z.string(),
  assetIds: z.array(z.string()).default([]),
  assetId: z.string().nullable().optional(),
  colors: z.array(z.string()),
  error: z.string().nullable(),
})
export type WebsiteCapture = z.infer<typeof WebsiteCapture>

export const ResearchOutput = z.object({
  sources: z.array(ResearchSource),
  captures: z.array(WebsiteCapture).default([]),
  queries: z.array(z.string()),
})

export const Claim = z
  .object({
    text: z.string().min(1),
    status: z.enum(['verified', 'assumption']),
    sourceUrl: z.string().nullable(),
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

export const CopyDraft = z.object({ posts: z.array(PostCopy).length(3) })

export const UnsupportedFact = z.object({
  postIndex: z.number().int(),
  place: z.union([z.literal('caption'), z.number().int()]),
  kind: z.enum(['number', 'quote']),
  value: z.string(),
  context: z.string(),
})
export type UnsupportedFact = z.infer<typeof UnsupportedFact>

export const CopyOutput = CopyDraft.extend({
  unsupported: z.array(UnsupportedFact),
})

export const RenderedSlide = z.object({
  postIndex: z.number().int(),
  order: z.number().int(),
  assetId: z.string(),
  backgroundAssetId: z.string(),
})
export type RenderedSlide = z.infer<typeof RenderedSlide>

export const VisualsOutput = z.object({ slides: z.array(RenderedSlide) })

export const SlideCheck = z.object({
  postIndex: z.number().int(),
  order: z.number().int(),
  passed: z.boolean(),
  issues: z.array(z.string()),
})
export type SlideCheck = z.infer<typeof SlideCheck>

export const ReviewDraft = z.object({ slides: z.array(SlideCheck) })

export const ReviewOutput = z.object({
  score: z.number().min(0).max(1),
  slides: z.array(
    SlideCheck.extend({
      ruleIssues: z.array(z.string()),
      regenerated: z.boolean(),
    }),
  ),
  issues: z.array(z.string()),
  replaced: z.array(RenderedSlide),
})
export type ReviewOutput = z.infer<typeof ReviewOutput>

export const ExportOutput = z.object({
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

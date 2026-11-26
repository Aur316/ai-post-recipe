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

/** Phase outputs. Phases 5–8 are placeholders until M6–M8 fill them in. */
export const BriefOutput = z.object({ accepted: z.literal(true) })

export const ResearchOutput = z.object({
  sources: z.array(
    z.object({
      url: z.string(),
      title: z.string(),
      excerpt: z.string(),
      reachable: z.boolean(),
    }),
  ),
})

export const AnalysisOutput = z.object({
  tone: z.string(),
  audience: z.string(),
  themes: z.array(z.string()),
  colors: z.array(z.string()),
  claims: z.array(
    z.object({
      text: z.string(),
      status: z.enum(['verified', 'assumption']),
      sourceUrl: z.string().optional(),
    }),
  ),
})

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

export const CopyOutput = z.object({
  posts: z.array(
    z.object({
      index: z.number().int(),
      caption: z.string(),
      hashtags: z.array(z.string()),
      slides: z.array(z.object({ order: z.number().int(), text: z.string() })),
    }),
  ),
})

export const VisualsOutput = z.object({
  slides: z.array(
    z.object({
      postIndex: z.number().int(),
      order: z.number().int(),
      assetId: z.string().optional(),
    }),
  ),
})

export const ReviewOutput = z.object({
  score: z.number(),
  issues: z.array(z.string()),
})

export const ExportOutput = z.object({ assetId: z.string().optional() })

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

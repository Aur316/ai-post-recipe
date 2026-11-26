import { z } from 'zod'

import { AssetDto } from './assets.js'
import { paginated } from './pagination.js'
import { PhaseRunDto, PostFormat } from './phases.js'
import { PostDto } from './posts.js'
import { SourceDto } from './sources.js'

export const OutputLanguage = z.enum(['hr', 'en'])
export type OutputLanguage = z.infer<typeof OutputLanguage>

export const StyleSource = z.enum(['UPLOADS', 'WEBSITE'])
export type StyleSource = z.infer<typeof StyleSource>

export function instagramHandle(url: string) {
  const match = /instagram\.com\/([^/?#]+)/i.exec(url)
  return match?.[1] ? `@${match[1]}` : undefined
}

export const LinkType = z.enum(['WEBSITE', 'SHOP', 'CATALOG', 'OTHER'])
export type LinkType = z.infer<typeof LinkType>

export const BRIEF_LIMITS = {
  brandName: 120,
  url: 2048,
  reason: 1000,
  productName: 200,
  audience: 1000,
  goals: 1000,
  inspiration: 2000,
} as const

export interface BriefMessages {
  url: string
  tooLong: (max: number) => string
  brandNameRequired: string
  instagramProfile: string
  reasonTooShort: string
  linksRequired: string
  productNameRequired: string
  productsRequired: string
  audienceRequired: string
  goalsRequired: string
}

export const BRIEF_MESSAGES_EN: BriefMessages = {
  url: 'Enter a full http(s) URL',
  tooLong: (max) => `At most ${max} characters`,
  brandNameRequired: 'Brand name is required',
  instagramProfile: 'Use the brand’s instagram.com profile URL',
  reasonTooShort: 'Explain the choice in a sentence or two',
  linksRequired: 'Add at least the official website or shop',
  productNameRequired: 'Product name is required',
  productsRequired: 'Add at least one product to promote',
  audienceRequired: 'Describe the target audience',
  goalsRequired: 'Describe the goals',
}

export const createBriefSchema = (m: BriefMessages) => {
  const httpUrl = z
    .url({ protocol: /^https?$/, error: m.url })
    .max(BRIEF_LIMITS.url, m.tooLong(BRIEF_LIMITS.url))

  return z.object({
    brandName: z
      .string()
      .trim()
      .min(1, m.brandNameRequired)
      .max(BRIEF_LIMITS.brandName, m.tooLong(BRIEF_LIMITS.brandName)),
    instagramUrl: httpUrl
      .regex(/^https?:\/\/(www\.)?instagram\.com\/[^/?#]+/i, m.instagramProfile)
      .or(z.literal(''))
      .default(''),
    reason: z
      .string()
      .trim()
      .min(10, m.reasonTooShort)
      .max(BRIEF_LIMITS.reason, m.tooLong(BRIEF_LIMITS.reason)),
    links: z
      .array(z.object({ type: LinkType, url: httpUrl }))
      .min(1, m.linksRequired),
    products: z
      .array(
        z.object({
          name: z
            .string()
            .trim()
            .min(1, m.productNameRequired)
            .max(BRIEF_LIMITS.productName, m.tooLong(BRIEF_LIMITS.productName)),
          url: httpUrl.or(z.literal('')).optional(),
        }),
      )
      .min(1, m.productsRequired),
    audience: z
      .string()
      .trim()
      .min(3, m.audienceRequired)
      .max(BRIEF_LIMITS.audience, m.tooLong(BRIEF_LIMITS.audience)),
    goals: z
      .string()
      .trim()
      .min(3, m.goalsRequired)
      .max(BRIEF_LIMITS.goals, m.tooLong(BRIEF_LIMITS.goals)),
    inspiration: z
      .string()
      .trim()
      .max(BRIEF_LIMITS.inspiration, m.tooLong(BRIEF_LIMITS.inspiration))
      .default(''),
    inspirationLinks: z.array(httpUrl).default([]),
    language: OutputLanguage,
    formats: z.array(PostFormat).default([]),
    styleSource: StyleSource.default('UPLOADS'),
  })
}

export const Brief = createBriefSchema(BRIEF_MESSAGES_EN)

export type Brief = z.infer<typeof Brief>
export type BriefInput = z.input<typeof Brief>

export const RunStatus = z.enum([
  'DRAFT',
  'RUNNING',
  'AWAITING_APPROVAL',
  'COMPLETED',
  'FAILED',
])
export type RunStatus = z.infer<typeof RunStatus>

export const Usage = z.object({
  costUsd: z.number(),
  tokensIn: z.number().int(),
  tokensOut: z.number().int(),
})
export type Usage = z.infer<typeof Usage>

export const PhaseUsage = Usage.extend({
  phase: z.string(),
  attempts: z.number().int(),
})
export type PhaseUsage = z.infer<typeof PhaseUsage>

export const RunSummaryDto = z.object({
  id: z.uuid(),
  brandName: z.string(),
  instagram: z.string(),
  language: OutputLanguage,
  status: RunStatus,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  usage: Usage,
})
export type RunSummaryDto = z.infer<typeof RunSummaryDto>

export const RunDetailDto = RunSummaryDto.extend({
  brief: Brief,
  assets: z.array(AssetDto),
  phases: z.array(PhaseRunDto),
  sources: z.array(SourceDto),
  posts: z.array(PostDto),
  usageByPhase: z.array(PhaseUsage),
})
export type RunDetailDto = z.infer<typeof RunDetailDto>

export const RunListResponse = paginated(RunSummaryDto)
export type RunListResponse = z.infer<typeof RunListResponse>

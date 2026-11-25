import { z } from 'zod'

import { AssetDto } from './assets.js'
import { paginated } from './pagination.js'

export const OutputLanguage = z.enum(['hr', 'en'])
export type OutputLanguage = z.infer<typeof OutputLanguage>

export const PostFormat = z.enum(['IMAGE', 'CAROUSEL', 'STORY'])
export type PostFormat = z.infer<typeof PostFormat>

export const LinkType = z.enum(['WEBSITE', 'SHOP', 'CATALOG', 'OTHER'])
export type LinkType = z.infer<typeof LinkType>

/**
 * Maximum lengths for brief text fields. The API, the form (maxLength and the
 * character counters) and the database constraints all use these numbers; an
 * API test checks that the database matches them.
 */
export const BRIEF_LIMITS = {
  brandName: 120,
  url: 2048,
  reason: 1000,
  productName: 200,
  audience: 1000,
  goals: 1000,
  inspiration: 2000,
} as const

const tooLong = (max: number) => `At most ${max} characters`

const httpUrl = z
  .url({ protocol: /^https?$/, error: 'Enter a full http(s) URL' })
  .max(BRIEF_LIMITS.url, tooLong(BRIEF_LIMITS.url))

export const Brief = z.object({
  brandName: z
    .string()
    .trim()
    .min(1, 'Brand name is required')
    .max(BRIEF_LIMITS.brandName, tooLong(BRIEF_LIMITS.brandName)),
  instagramUrl: httpUrl.regex(
    /^https?:\/\/(www\.)?instagram\.com\/[^/?#]+/i,
    'Use the brand’s instagram.com profile URL',
  ),
  reason: z
    .string()
    .trim()
    .min(10, 'Explain the choice in a sentence or two')
    .max(BRIEF_LIMITS.reason, tooLong(BRIEF_LIMITS.reason)),
  links: z
    .array(z.object({ type: LinkType, url: httpUrl }))
    .min(1, 'Add at least the official website or shop'),
  products: z
    .array(
      z.object({
        name: z
          .string()
          .trim()
          .min(1, 'Product name is required')
          .max(BRIEF_LIMITS.productName, tooLong(BRIEF_LIMITS.productName)),
        url: httpUrl.or(z.literal('')).optional(),
      }),
    )
    .min(1, 'Add at least one product to promote'),
  audience: z
    .string()
    .trim()
    .min(3, 'Describe the target audience')
    .max(BRIEF_LIMITS.audience, tooLong(BRIEF_LIMITS.audience)),
  goals: z
    .string()
    .trim()
    .min(3, 'Describe the goals')
    .max(BRIEF_LIMITS.goals, tooLong(BRIEF_LIMITS.goals)),
  inspiration: z
    .string()
    .trim()
    .max(BRIEF_LIMITS.inspiration, tooLong(BRIEF_LIMITS.inspiration))
    .default(''),
  inspirationLinks: z.array(httpUrl).default([]),
  language: OutputLanguage,
  formats: z.array(PostFormat).default([]),
})

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

export const RunSummaryDto = z.object({
  id: z.uuid(),
  brandName: z.string(),
  instagram: z.string(),
  language: OutputLanguage,
  status: RunStatus,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type RunSummaryDto = z.infer<typeof RunSummaryDto>

export const RunDetailDto = RunSummaryDto.extend({
  brief: Brief,
  assets: z.array(AssetDto),
})
export type RunDetailDto = z.infer<typeof RunDetailDto>

export const RunListResponse = paginated(RunSummaryDto)
export type RunListResponse = z.infer<typeof RunListResponse>

import type { Usage } from '@ai-post-recipe/shared'

export const formatCost = (usd: number) =>
  `$${usd >= 0.01 || usd === 0 ? usd.toFixed(2) : usd.toFixed(4)}`

export const formatTokens = (count: number, locale?: string) =>
  new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(count)

export const totalTokens = (usage: Usage) => usage.tokensIn + usage.tokensOut

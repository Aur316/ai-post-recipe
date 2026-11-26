import type { Usage } from '@ai-post-recipe/shared'

/** "$0.76", or four decimals below a cent: "$0.0042". */
export const formatCost = (usd: number) =>
  `$${usd >= 0.01 || usd === 0 ? usd.toFixed(2) : usd.toFixed(4)}`

/** "115k", "1.2M". */
export const formatTokens = (count: number, locale?: string) =>
  new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(count)

export const totalTokens = (usage: Usage) => usage.tokensIn + usage.tokensOut

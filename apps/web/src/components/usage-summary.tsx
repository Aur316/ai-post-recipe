import type { PhaseKey, PhaseUsage, Usage } from '@ai-post-recipe/shared'
import { CoinsIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

import { formatCost, formatTokens, totalTokens } from '@/utils/usage'

/** "$0.76 · 115k tokens": what the run's AI calls cost, re-runs included. */
export function UsageBadge({ usage }: { usage: Usage }) {
  const { t, i18n } = useTranslation()
  return (
    <Badge variant="neutral" className="tabular-nums">
      {t('usage.short', {
        cost: formatCost(usage.costUsd),
        tokens: formatTokens(totalTokens(usage), i18n.language),
      })}
    </Badge>
  )
}

/** The total, with a breakdown per phase on click. */
export function UsageButton({
  usage,
  byPhase,
}: {
  usage: Usage
  byPhase: Array<PhaseUsage>
}) {
  const { t } = useTranslation()
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={t('usage.details')}
        >
          <CoinsIcon />
          <UsageText usage={usage} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto">
        <UsageTable usage={usage} byPhase={byPhase} />
      </PopoverContent>
    </Popover>
  )
}

function UsageText({ usage }: { usage: Usage }) {
  const { t, i18n } = useTranslation()
  return (
    <span className="tabular-nums">
      {t('usage.short', {
        cost: formatCost(usage.costUsd),
        tokens: formatTokens(totalTokens(usage), i18n.language),
      })}
    </span>
  )
}

/** Attempts, input and output tokens and cost per phase, and the total. */
export function UsageTable({
  usage,
  byPhase,
}: {
  usage: Usage
  byPhase: Array<PhaseUsage>
}) {
  const { t, i18n } = useTranslation()
  const n = (value: number) => value.toLocaleString(i18n.language)
  return (
    <div className="space-y-2 text-sm">
      <p className="font-medium">{t('usage.title')}</p>
      <table className="tabular-nums">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th className="pr-4 text-left font-normal">{t('usage.phase')}</th>
            <th className="pr-4 text-right font-normal">
              {t('usage.attempts')}
            </th>
            <th className="pr-4 text-right font-normal">
              {t('usage.tokensIn')}
            </th>
            <th className="pr-4 text-right font-normal">
              {t('usage.tokensOut')}
            </th>
            <th className="text-right font-normal">{t('usage.cost')}</th>
          </tr>
        </thead>
        <tbody>
          {byPhase.map((row) => (
            <tr key={row.phase}>
              <td className="pr-4">{t(`phases.${row.phase as PhaseKey}`)}</td>
              <td className="pr-4 text-right">{row.attempts}</td>
              <td className="pr-4 text-right">{n(row.tokensIn)}</td>
              <td className="pr-4 text-right">{n(row.tokensOut)}</td>
              <td className="text-right">{formatCost(row.costUsd)}</td>
            </tr>
          ))}
          <tr className="border-t font-semibold">
            <td className="pt-1 pr-4">{t('usage.total')}</td>
            <td className="pt-1 pr-4 text-right">
              {byPhase.reduce((sum, r) => sum + r.attempts, 0)}
            </td>
            <td className="pt-1 pr-4 text-right">{n(usage.tokensIn)}</td>
            <td className="pt-1 pr-4 text-right">{n(usage.tokensOut)}</td>
            <td className="pt-1 text-right">{formatCost(usage.costUsd)}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-xs text-muted-foreground">{t('usage.note')}</p>
    </div>
  )
}

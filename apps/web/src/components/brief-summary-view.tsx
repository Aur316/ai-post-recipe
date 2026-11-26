import type { RunDetailDto } from '@ai-post-recipe/shared'
import { CheckCircle2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'

export function BriefSummaryView({ run }: { run: RunDetailDto }) {
  const { t } = useTranslation()
  const { brief } = run

  return (
    <div className="space-y-3 text-sm">
      <p className="flex items-center gap-2">
        <CheckCircle2Icon className="size-4 text-emerald-500" />
        {t('briefSummary.accepted', { brand: brief.brandName })}
      </p>
      <dl className="@container grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t('briefSummary.links')} value={brief.links.length} />
        <Stat
          label={t('briefSummary.products')}
          value={brief.products.length}
        />
        <Stat
          label={t('briefSummary.references')}
          value={run.assets.filter((a) => a.kind.startsWith('UPLOAD_')).length}
        />
        <Stat
          label={t('briefSummary.language')}
          value={t(`outputLanguage.${brief.language}`)}
        />
      </dl>
      <div className="flex flex-wrap gap-1">
        {brief.products.map((p) => (
          <Badge key={p.name} variant="neutral">
            {p.name}
          </Badge>
        ))}
        {brief.formats.map((f) => (
          <Badge key={f} variant="info">
            {t(`brief.formatTypes.${f}`)}
          </Badge>
        ))}
      </div>
    </div>
  )
}

export function Stat({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="rounded-md border p-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

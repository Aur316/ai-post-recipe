import type { AnalysisOutput } from '@ai-post-recipe/shared'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'

interface AnalysisViewProps {
  analysis: AnalysisOutput
}

/** The brand analysis as a person reads it; every claim shows its label and source. */
export function AnalysisView({ analysis }: AnalysisViewProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4 text-sm">
      <p>{analysis.summary}</p>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t('analysis.tone')}>{analysis.tone}</Field>
        <Field label={t('analysis.audience')}>{analysis.audience}</Field>
        <Field label={t('analysis.visualStyle')}>{analysis.visualStyle}</Field>
        <Field label={t('analysis.productPresentation')}>
          {analysis.productPresentation}
        </Field>
        <Field label={t('analysis.peoplePresentation')}>
          {analysis.peoplePresentation}
        </Field>
        <Field label={t('analysis.themes')}>
          <span className="flex flex-wrap gap-1">
            {analysis.themes.map((theme) => (
              // A long theme wraps instead of running off a phone screen.
              <Badge
                key={theme}
                variant="neutral"
                className="h-auto max-w-full shrink rounded-md py-0.5 whitespace-normal"
              >
                {theme}
              </Badge>
            ))}
          </span>
        </Field>
      </dl>

      {analysis.colors.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium">{t('analysis.colors')}</p>
          <ul className="flex flex-wrap gap-3">
            {analysis.colors.map((color) => (
              <li
                key={color.hex + color.name}
                className="flex items-center gap-2"
              >
                <span
                  aria-hidden
                  className="size-6 shrink-0 rounded-md border"
                  style={{ backgroundColor: color.hex }}
                />
                <span>
                  {color.name}{' '}
                  <span className="text-muted-foreground tabular-nums">
                    {color.hex}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {color.usage}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <p className="font-medium">{t('analysis.claims')}</p>
        <ul className="space-y-2">
          {analysis.claims.map((claim, i) => (
            <li key={i} className="flex items-start gap-2">
              <Badge
                variant={claim.status === 'verified' ? 'success' : 'warning'}
                className="mt-0.5"
              >
                {t(`analysis.status.${claim.status}`)}
              </Badge>
              <div className="min-w-0">
                <p>{claim.text}</p>
                {claim.evidence && (
                  <p className="text-xs text-muted-foreground italic">
                    “{claim.evidence}”
                  </p>
                )}
                {claim.sourceUrl && (
                  <a
                    href={claim.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-xs underline"
                  >
                    {claim.sourceUrl}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {analysis.gaps.length > 0 && (
        <div className="space-y-1">
          <p className="font-medium">{t('analysis.gaps')}</p>
          <ul className="list-inside list-disc text-muted-foreground">
            {analysis.gaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  )
}

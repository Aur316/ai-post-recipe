import type { PhaseOutputs } from '@ai-post-recipe/shared'
import { CircleAlertIcon, CircleCheckIcon, RefreshCwIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Stat } from '@/components/brief-summary-view'
import { Badge } from '@/components/ui/badge'

export function ReviewView({ review }: { review: PhaseOutputs['REVIEW'] }) {
  const { t } = useTranslation()
  const passed = review.slides.filter((s) => s.passed).length
  const regenerated = review.slides.filter((s) => s.regenerated).length

  return (
    <div className="space-y-3 text-sm">
      <dl className="grid grid-cols-3 gap-3">
        <Stat
          label={t('review.score')}
          value={`${Math.round(review.score * 100)}%`}
        />
        <Stat
          label={t('review.passed')}
          value={`${passed}/${review.slides.length}`}
        />
        <Stat label={t('review.regenerated')} value={regenerated} />
      </dl>

      {review.issues.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-200">
          {review.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}

      <ul className="space-y-1">
        {review.slides.map((slide) => (
          <li
            key={`${slide.postIndex}-${slide.order}`}
            className="flex items-start gap-2"
          >
            {slide.passed ? (
              <CircleCheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            ) : (
              <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
            )}
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2">
                {t('posts.post', { index: slide.postIndex })},{' '}
                {t('copy.slide', { order: slide.order })}
                {slide.regenerated && (
                  <Badge variant="info">
                    <RefreshCwIcon />
                    {t('review.remade')}
                  </Badge>
                )}
              </p>
              {[...slide.ruleIssues, ...slide.issues].map((issue) => (
                <p key={issue} className="text-xs text-muted-foreground">
                  {issue}
                </p>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

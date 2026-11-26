import type { PhaseOutputs } from '@ai-post-recipe/shared'
import { CircleAlertIcon, CircleCheckIcon, SearchIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Stat } from '@/components/brief-summary-view'
import { Badge } from '@/components/ui/badge'

import { assetsQueryFunctions } from '@/data/query-functions/assets'

/** What research looked for and which pages it could read. */
export function ResearchView({
  research,
}: {
  research: PhaseOutputs['RESEARCH']
}) {
  const { t } = useTranslation()
  const read = research.sources.filter((s) => s.reachable).length
  const fromSearch = research.sources.filter(
    (s) => s.origin === 'SEARCH',
  ).length

  return (
    <div className="space-y-3 text-sm">
      <dl className="grid grid-cols-3 gap-3">
        <Stat label={t('research.read')} value={read} />
        <Stat
          label={t('research.unreachable')}
          value={research.sources.length - read}
        />
        <Stat label={t('research.fromSearch')} value={fromSearch} />
      </dl>

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">{t('research.queries')}</p>
        {research.queries.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {research.queries.map((q) => (
              <Badge key={q} variant="neutral">
                <SearchIcon />
                {q}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">{t('research.noSearch')}</p>
        )}
      </div>

      {research.captures.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {t('research.captures')}
          </p>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {research.captures.flatMap((capture) => {
              const ids = capture.assetIds.length
                ? capture.assetIds
                : capture.assetId
                  ? [capture.assetId]
                  : []
              if (ids.length === 0) {
                return [
                  <li key={capture.url} className="space-y-1">
                    <p className="text-xs text-destructive">{capture.error}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {capture.url}
                    </p>
                  </li>,
                ]
              }
              return ids.map((id, i) => (
                <li key={id} className="space-y-1">
                  <img
                    src={assetsQueryFunctions.url(id)}
                    alt={`${capture.url} (${i + 1})`}
                    className="aspect-[16/10] w-full rounded-md border object-cover object-top"
                  />
                  <p className="truncate text-xs text-muted-foreground">
                    {capture.url}
                  </p>
                  {i === 0 && (
                    <div className="flex gap-1">
                      {capture.colors.map((hex) => (
                        <span
                          key={hex}
                          title={hex}
                          className="size-4 rounded-sm border"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  )}
                </li>
              ))
            })}
          </ul>
        </div>
      )}

      <ul className="space-y-1">
        {research.sources.map((source) => (
          <li key={source.url} className="flex items-start gap-2">
            {source.reachable ? (
              <CircleCheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            ) : (
              <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
            )}
            <div className="min-w-0">
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="block truncate underline"
              >
                {source.title || source.url}
              </a>
              <p className="truncate text-xs text-muted-foreground">
                {t(`sources.origin.${source.origin}`)} · {source.url}
                {source.error && ` · ${source.error}`}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

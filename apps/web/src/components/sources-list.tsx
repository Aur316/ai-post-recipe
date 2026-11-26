import type { SourceDto } from '@ai-post-recipe/shared'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'

export function SourcesList({ sources }: { sources: Array<SourceDto> }) {
  const { t } = useTranslation()
  const unreachable = sources.filter((s) => !s.reachable).length

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t('sources.summary', {
          read: sources.length - unreachable,
          unreachable,
        })}
      </p>
      <ul className="divide-y rounded-lg border">
        {sources.map((source) => (
          <li key={source.id} className="space-y-1 p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 font-medium break-words underline"
              >
                {source.title || source.url}
              </a>
              <div className="flex shrink-0 gap-1">
                <Badge variant="neutral">
                  {t(`sources.origin.${source.origin}`)}
                </Badge>
                <Badge variant={source.reachable ? 'success' : 'danger'}>
                  {source.reachable
                    ? t('sources.read')
                    : t('sources.unreachable')}
                </Badge>
              </div>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {source.url}
            </p>
            {source.error && (
              <p className="text-xs text-destructive">{source.error}</p>
            )}
            {source.excerpt && (
              <p className="line-clamp-2 text-muted-foreground">
                {source.excerpt}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

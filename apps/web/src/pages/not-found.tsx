import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'

import { useLocalizedPath } from '@/hooks/useLocalizedPath'

interface NotFoundProps {
  /** Overrides the generic text, e.g. for a run that does not exist. */
  title?: string
}

/** 404: an unknown address, or a page whose record does not exist. */
export function NotFound({ title }: NotFoundProps) {
  const { t } = useTranslation()
  const localized = useLocalizedPath()

  return (
    <section className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      {/* Keeps search engines from indexing the error page. */}
      <meta name="robots" content="noindex" />
      <p className="text-6xl font-semibold text-muted-foreground tabular-nums">
        404
      </p>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">
          {title ?? t('notFound.title')}
        </h1>
        <p className="text-muted-foreground">{t('notFound.description')}</p>
      </div>
      <Button asChild>
        <Link to={localized('/')}>{t('notFound.backToRuns')}</Link>
      </Button>
    </section>
  )
}

import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'

import { cn } from '@/lib/utils'

import { useLocalizedPath } from '@/hooks/useLocalizedPath'
import { PAGE_WIDTH } from '@/utils/layout'

interface NotFoundProps {
  title?: string
}

export function NotFound({ title }: NotFoundProps) {
  const { t } = useTranslation()
  const localized = useLocalizedPath()

  return (
    <section
      className={cn(
        PAGE_WIDTH,
        'flex flex-col items-center justify-center gap-4 py-16 text-center',
      )}
    >
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

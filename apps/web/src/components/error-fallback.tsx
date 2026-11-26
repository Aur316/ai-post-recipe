import { TriangleAlertIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

import { cn } from '@/lib/utils'

interface ErrorFallbackProps {
  error: unknown
  /** Tries to render again; without it the button reloads the page. */
  reset?: () => void
  /** Fills the screen when the whole app failed, not just one page. */
  fullScreen?: boolean
}

/** What a person sees after a render error, with a way out. */
export function ErrorFallback({
  error,
  reset,
  fullScreen,
}: ErrorFallbackProps) {
  const { t } = useTranslation()
  const message = error instanceof Error ? error.message : String(error)

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-16 text-center',
        fullScreen && 'min-h-screen bg-background px-4 text-foreground',
      )}
    >
      <TriangleAlertIcon className="size-10 text-destructive" />
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{t('errorPage.title')}</h1>
        <p className="text-muted-foreground">{t('errorPage.description')}</p>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={() => (reset ? reset() : window.location.reload())}
        >
          {t('errorPage.tryAgain')}
        </Button>
        {/* A full page load, so the app starts from a clean state. */}
        <Button asChild variant="outline">
          <a href="/">{t('errorPage.backToRuns')}</a>
        </Button>
      </div>
      {import.meta.env.DEV && (
        <details className="max-w-xl text-left text-sm">
          <summary className="cursor-pointer text-muted-foreground">
            {t('errorPage.details')}
          </summary>
          <pre className="mt-2 scrollbar-thin overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
            {message}
          </pre>
        </details>
      )}
    </div>
  )
}

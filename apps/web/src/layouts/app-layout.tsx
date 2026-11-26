import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation } from 'react-router'

import { DemoModeBanner } from '@/components/demo-mode-banner'
import { ErrorBoundary } from '@/components/error-boundary'
import { ErrorFallback } from '@/components/error-fallback'
import { LanguageToggle } from '@/components/language-toggle'
import { ThemeToggle } from '@/components/theme-toggle'
import { Toaster } from '@/components/ui/sonner'

import { useLocalizedPath } from '@/hooks/useLocalizedPath'
import { useTheme } from '@/hooks/useTheme'

export function AppLayout() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useTranslation()
  const localized = useLocalizedPath()
  const { pathname } = useLocation()

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="shrink-0 border-b">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-3 lg:px-6">
          <Link to={localized('/')} className="font-semibold">
            {t('layout.appName')}
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </div>
      </header>
      <DemoModeBanner />
      {/* Pages taller than the screen scroll here; the runs page fills it and scrolls its own list.
          The bottom padding sits on the page itself, so it stays below content that overflows.
          The shell is wide for the two-column run page; other pages narrow themselves (PAGE_WIDTH).
          `main` paints its own background: on high-density screens Chrome draws the scrolling area
          as a separate layer, and a transparent one showed up darker than the page. */}
      <main className="scrollbar-thin min-h-0 flex-1 overflow-y-auto bg-background">
        <div className="mx-auto h-full max-w-screen-2xl px-4 pt-8 *:pb-8 lg:px-6">
          {/* A page that fails keeps the header; another page clears the error. */}
          <ErrorBoundary
            resetKey={pathname}
            fallback={(props) => <ErrorFallback {...props} />}
          >
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
      <Toaster theme={theme} />
    </div>
  )
}

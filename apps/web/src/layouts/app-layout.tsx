import { useTranslation } from 'react-i18next'
import { Link, Outlet } from 'react-router'

import { LanguageToggle } from '@/components/language-toggle'
import { ThemeToggle } from '@/components/theme-toggle'
import { Toaster } from '@/components/ui/sonner'

import { useLocalizedPath } from '@/hooks/useLocalizedPath'
import { useTheme } from '@/hooks/useTheme'

export function AppLayout() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useTranslation()
  const localized = useLocalizedPath()

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="shrink-0 border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to={localized('/')} className="font-semibold">
            {t('layout.appName')}
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </div>
      </header>
      {/* Pages taller than the screen scroll here; the runs page fills it and scrolls its own list.
          The bottom padding sits on the page itself, so it stays below content that overflows. */}
      <main className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto h-full max-w-5xl px-4 pt-8 *:pb-8">
          <Outlet />
        </div>
      </main>
      <Toaster theme={theme} />
    </div>
  )
}

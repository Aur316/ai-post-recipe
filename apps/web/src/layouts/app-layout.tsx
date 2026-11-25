import { Link, Outlet } from 'react-router'

import { ThemeToggle } from '@/components/theme-toggle'
import { Toaster } from '@/components/ui/sonner'

import { useTheme } from '@/hooks/useTheme'

export function AppLayout() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="shrink-0 border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-semibold">
            AI Post Recipe
          </Link>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>
      {/* Pages taller than the screen scroll here; the runs page fills it and scrolls its own list. */}
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto h-full max-w-5xl px-4 py-8">
          <Outlet />
        </div>
      </main>
      <Toaster theme={theme} />
    </div>
  )
}

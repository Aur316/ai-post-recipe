import { useState } from 'react'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'theme'

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  )

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {}
    setTheme(next)
  }

  return { theme, toggleTheme }
}

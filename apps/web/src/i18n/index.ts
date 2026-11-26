import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { en } from '@/i18n/locales/en'
import { hr } from '@/i18n/locales/hr'

/**
 * The interface language is the first segment of every URL (`/en/…`, `/hr/…`),
 * so each language has its own indexable address. The last choice is also kept
 * in localStorage, only to pick the language when a URL has none.
 */
export const LANGUAGES = ['en', 'hr'] as const
export type Language = (typeof LANGUAGES)[number]
export const DEFAULT_LANGUAGE: Language = 'en'

const STORAGE_KEY = 'language'

export const isLanguage = (value: unknown): value is Language =>
  LANGUAGES.includes(value as Language)

/** The saved choice, else Croatian for a Croatian browser, else English. */
export const preferredLanguage = (): Language => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isLanguage(saved)) return saved
  } catch {
    // Storage can be blocked (private mode).
  }
  return navigator.language.toLowerCase().startsWith('hr')
    ? 'hr'
    : DEFAULT_LANGUAGE
}

/** `/hr/runs/1` with `en` → `/en/runs/1`; a path without a language gets one. */
export const withLanguage = (path: string, language: Language) => {
  // A query or hash (`/?search=x`) stays as it is.
  const index = path.search(/[?#]/)
  const pathname = index === -1 ? path : path.slice(0, index)
  const suffix = index === -1 ? '' : path.slice(index)
  const [, first = '', ...rest] = pathname.split('/')
  const segments = isLanguage(first) ? rest : [first, ...rest]
  const tail = segments.filter(Boolean).join('/')
  return `/${language}${tail ? `/${tail}` : ''}${suffix}`
}

export const setLanguage = async (language: Language) => {
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // The language still switches for this visit.
  }
  if (i18n.language !== language) await i18n.changeLanguage(language)
}

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language
})

const languageInUrl = window.location.pathname.split('/')[1]

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hr: { translation: hr } },
  // Start in the URL's language, so the first render is already right.
  lng: isLanguage(languageInUrl) ? languageInUrl : preferredLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  // React already escapes text.
  interpolation: { escapeValue: false },
})

export default i18n

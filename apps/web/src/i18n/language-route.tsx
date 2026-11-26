import { useEffect } from 'react'

import { useTranslation } from 'react-i18next'
import { Navigate, Outlet, useLocation, useParams } from 'react-router'

import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  isLanguage,
  preferredLanguage,
  setLanguage,
  withLanguage,
} from '@/i18n'

export function LanguageRoute() {
  const { lang } = useParams()
  const { pathname, search, hash } = useLocation()
  const { t } = useTranslation()

  useEffect(() => {
    if (isLanguage(lang)) void setLanguage(lang)
  }, [lang])

  if (!isLanguage(lang)) {
    return (
      <Navigate
        to={`${withLanguage(pathname, preferredLanguage())}${search}${hash}`}
        replace
      />
    )
  }

  const url = (path: string) => `${window.location.origin}${path}`
  return (
    <>
      <meta name="description" content={t('meta.description')} />
      <link rel="canonical" href={url(pathname)} />
      {LANGUAGES.map((language) => (
        <link
          key={language}
          rel="alternate"
          hrefLang={language}
          href={url(withLanguage(pathname, language))}
        />
      ))}
      <link
        rel="alternate"
        hrefLang="x-default"
        href={url(withLanguage(pathname, DEFAULT_LANGUAGE))}
      />
      <Outlet />
    </>
  )
}

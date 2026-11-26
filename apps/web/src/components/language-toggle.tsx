import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'

import { LANGUAGES, setLanguage, withLanguage } from '@/i18n'

export function LanguageToggle() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { pathname, search, hash } = useLocation()

  return (
    <div role="group" aria-label={t('layout.language')} className="flex">
      {LANGUAGES.map((language) => (
        <Button
          key={language}
          type="button"
          variant={i18n.language === language ? 'secondary' : 'ghost'}
          size="sm"
          aria-pressed={i18n.language === language}
          onClick={() => {
            void setLanguage(language)
            void navigate(`${withLanguage(pathname, language)}${search}${hash}`)
          }}
        >
          {language.toUpperCase()}
        </Button>
      ))}
    </div>
  )
}

import { useParams } from 'react-router'

import { DEFAULT_LANGUAGE, isLanguage, withLanguage } from '@/i18n'

export const useLocalizedPath = () => {
  const { lang } = useParams()
  const language = isLanguage(lang) ? lang : DEFAULT_LANGUAGE
  return (path: string) => withLanguage(path, language)
}

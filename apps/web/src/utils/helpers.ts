import { ErrorResponse } from '@ai-post-recipe/shared'
import { isAxiosError } from 'axios'

import i18n from '@/i18n'
import { type Translation, en } from '@/i18n/locales/en'

type TranslatedErrorCode = keyof Translation['apiErrors']

const isTranslatedErrorCode = (code: string): code is TranslatedErrorCode =>
  code in en.apiErrors

export const getApiErrorMessage = (
  error: unknown,
  fallback?: string,
): string => {
  if (isAxiosError(error)) {
    const body = ErrorResponse.safeParse(error.response?.data)
    if (body.success) {
      const { code, message } = body.data.error
      return isTranslatedErrorCode(code) ? i18n.t(`apiErrors.${code}`) : message
    }
  }
  return fallback ?? i18n.t('common.somethingWentWrong')
}

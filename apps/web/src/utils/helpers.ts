import { ErrorResponse } from '@ai-post-recipe/shared'
import { isAxiosError } from 'axios'

/** The API's error message, or a fallback when the response has none. */
export const getApiErrorMessage = (
  error: unknown,
  fallback = 'Something went wrong',
): string => {
  if (isAxiosError(error)) {
    const body = ErrorResponse.safeParse(error.response?.data)
    if (body.success) return body.data.error.message
  }
  return fallback
}

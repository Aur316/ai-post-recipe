import '@testing-library/jest-dom/vitest'

import i18n from '@/i18n'
import { server } from '@/test/server'

URL.createObjectURL = () => 'blob:preview'
URL.revokeObjectURL = () => undefined

globalThis.ResizeObserver = class {
  observe = () => undefined
  unobserve = () => undefined
  disconnect = () => undefined
}

globalThis.IntersectionObserver = function (
  callback: IntersectionObserverCallback,
) {
  const observer = {
    root: null,
    rootMargin: '',
    scrollMargin: '',
    thresholds: [],
    observe: (target: Element) =>
      callback(
        [{ isIntersecting: true, target } as IntersectionObserverEntry],
        observer,
      ),
    unobserve: () => undefined,
    disconnect: () => undefined,
    takeRecords: () => [],
  }
  return observer
} as unknown as typeof IntersectionObserver

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(async () => {
  localStorage.removeItem('language')
  sessionStorage.clear()
  await i18n.changeLanguage('en')
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

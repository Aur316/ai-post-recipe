import '@testing-library/jest-dom/vitest'

import { server } from '@/test/server'

URL.createObjectURL = () => 'blob:preview'
URL.revokeObjectURL = () => undefined

// jsdom lacks ResizeObserver, which Radix components use for sizing.
globalThis.ResizeObserver = class {
  observe = () => undefined
  unobserve = () => undefined
  disconnect = () => undefined
}

// jsdom lacks IntersectionObserver; report every observed element as visible,
// so infinite lists load their next page as soon as the sentry renders.
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
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

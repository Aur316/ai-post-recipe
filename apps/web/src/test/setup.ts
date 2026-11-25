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

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

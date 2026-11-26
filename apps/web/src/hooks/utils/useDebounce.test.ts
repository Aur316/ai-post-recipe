import { act, renderHook } from '@testing-library/react'

import { useDebounce } from '@/hooks/utils/useDebounce'

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('returns the value only after it has stopped changing for the delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce({ value, delay: 200 }),
      { initialProps: { value: 'r' } },
    )

    rerender({ value: 're' })
    act(() => {
      vi.advanceTimersByTime(150)
    })
    rerender({ value: 'rev' })
    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(result.current).toBe('r')

    act(() => {
      vi.advanceTimersByTime(60)
    })
    expect(result.current).toBe('rev')
  })
})

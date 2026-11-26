import { useEffect, useState } from 'react'

/** The value, once it has stopped changing for `delay` ms (e.g. while typing). */
export function useDebounce<T>({
  value,
  delay = 300,
}: {
  value: T
  delay?: number
}) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

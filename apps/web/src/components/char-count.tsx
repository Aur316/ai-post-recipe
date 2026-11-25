import {
  type Control,
  type FieldPath,
  type FieldValues,
  useWatch,
} from 'react-hook-form'

import { cn } from '@/lib/utils'

interface CharCountProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  max: number
}

/** Shows "used / max" under a text field; turns red at the limit. */
export function CharCount<T extends FieldValues>({
  control,
  name,
  max,
}: CharCountProps<T>) {
  const value: unknown = useWatch({ control, name })
  const length = typeof value === 'string' ? value.length : 0
  return (
    <p
      className={cn(
        'text-right text-xs text-muted-foreground tabular-nums',
        length >= max && 'text-destructive',
      )}
    >
      {length} / {max}
    </p>
  )
}

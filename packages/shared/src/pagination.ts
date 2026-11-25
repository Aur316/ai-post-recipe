import { z } from 'zod'

/** Items per page for every paginated list; the infinite lists load this many at a time. */
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

/** Query string of a paginated list. Pages start at 1. */
export const ListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
})
export type ListQuery = z.infer<typeof ListQuery>

export const paginated = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int(),
    page: z.number().int(),
    size: z.number().int(),
    totalPages: z.number().int(),
  })

export interface Paginated<T> {
  items: Array<T>
  total: number
  page: number
  size: number
  totalPages: number
}

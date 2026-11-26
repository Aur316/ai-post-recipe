export interface Change {
  path: string
  before: unknown
  after: unknown
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null

export function findChanges(
  before: unknown,
  after: unknown,
  path = '',
): Array<Change> {
  if (isObject(before) && isObject(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)])
    return [...keys].flatMap((key) =>
      findChanges(before[key], after[key], path ? `${path}.${key}` : key),
    )
  }
  return JSON.stringify(before) === JSON.stringify(after)
    ? []
    : [{ path, before, after }]
}

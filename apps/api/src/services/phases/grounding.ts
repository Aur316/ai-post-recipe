import type { PostCopy, UnsupportedFact } from '@ai-post-recipe/shared'

/** "6,5" and "6.5" are the same number; thousands separators are dropped. */
const normalizeNumber = (raw: string) =>
  raw.replace(/(\d)[.\s](?=\d{3}\b)/g, '$1').replace(',', '.')

/** Numbers with at least two digits, or with a decimal part: "22", "6,5", "1000". */
const NUMBER = /\d+(?:[.,\s]\d+)*/g
/** Text in straight or typographic quotes, at least three words long. */
const QUOTE = /["“„«»”]([^"“„«»”]{12,})["“”»«]/g

const around = (text: string, index: number, length: number) =>
  text
    .slice(Math.max(0, index - 30), index + length + 30)
    .replace(/\s+/g, ' ')
    .trim()

/** Small numbers (1–9) are too common to check: list items, "3 tips". */
const isTrivial = (normalized: string) => /^\d$/.test(normalized)

/**
 * Lists the numbers and quotes in the copy that appear in none of the
 * material the run had: the source pages, the analysis's evidence quotes
 * and the brief. A fixed check, so the result does not depend on the model.
 * A listed item is not necessarily wrong, but a person should check it.
 */
export function findUnsupportedFacts(
  posts: Array<PostCopy>,
  corpus: Array<string>,
): Array<UnsupportedFact> {
  const text = corpus.join('\n').toLowerCase()
  const numbers = new Set(
    [...text.matchAll(NUMBER)].map((m) => normalizeNumber(m[0])),
  )
  const plainText = text.replace(/\s+/g, ' ')

  const found: Array<UnsupportedFact> = []
  for (const post of posts) {
    const places: Array<[UnsupportedFact['place'], string]> = [
      ['caption', post.caption],
      ...post.slides.map((s): [number, string] => [s.order, s.text]),
    ]
    for (const [place, value] of places) {
      for (const match of value.matchAll(NUMBER)) {
        const normalized = normalizeNumber(match[0])
        if (isTrivial(normalized) || numbers.has(normalized)) continue
        found.push({
          postIndex: post.index,
          place,
          kind: 'number',
          value: match[0],
          context: around(value, match.index, match[0].length),
        })
      }
      for (const match of value.matchAll(QUOTE)) {
        const quoted = (match[1] ?? '').trim()
        if (plainText.includes(quoted.toLowerCase().replace(/\s+/g, ' '))) {
          continue
        }
        found.push({
          postIndex: post.index,
          place,
          kind: 'quote',
          value: quoted,
          context: around(value, match.index, match[0].length),
        })
      }
    }
  }
  return found
}

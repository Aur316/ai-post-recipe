import type { PostCopy, UnsupportedFact } from '@ai-post-recipe/shared'

const normalizeNumber = (raw: string) =>
  raw.replace(/(\d)[.\s](?=\d{3}\b)/g, '$1').replace(',', '.')

const NUMBER = /\d+(?:[.,\s]\d+)*/g
const QUOTE = /["“„«»”]([^"“„«»”]{12,})["“”»«]/g

const around = (text: string, index: number, length: number) =>
  text
    .slice(Math.max(0, index - 30), index + length + 30)
    .replace(/\s+/g, ' ')
    .trim()

const isTrivial = (normalized: string) => /^\d$/.test(normalized)

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

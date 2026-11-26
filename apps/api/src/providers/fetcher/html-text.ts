import { parse } from 'node-html-parser'

const REMOVED =
  'script, style, noscript, svg, template, iframe, nav, footer, header, form, aside'

export interface PageContent {
  title: string
  description: string
  text: string
}

export function htmlToText(html: string): PageContent {
  const root = parse(html, { comment: false })
  const meta = (selector: string) =>
    root.querySelector(selector)?.getAttribute('content')?.trim() ?? ''

  const title =
    meta('meta[property="og:title"]') ||
    root.querySelector('title')?.text.trim() ||
    ''
  const description =
    meta('meta[name="description"]') || meta('meta[property="og:description"]')

  for (const node of root.querySelectorAll(REMOVED)) node.remove()
  const main =
    root.querySelector('main') ??
    root.querySelector('article') ??
    root.querySelector('body') ??
    root
  const text = main.structuredText
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')

  return {
    title: decode(title),
    description: decode(description),
    text: decode(text),
  }
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

function decode(text: string) {
  return text.replace(/&(#x?[0-9a-f]+|\w+);/gi, (entity, code: string) => {
    if (code.startsWith('#')) {
      const n =
        code[1]?.toLowerCase() === 'x'
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10)
      return Number.isNaN(n) ? entity : String.fromCodePoint(n)
    }
    return ENTITIES[code.toLowerCase()] ?? entity
  })
}

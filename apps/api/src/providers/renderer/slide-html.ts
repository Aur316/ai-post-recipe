import { createElement } from 'react'

import {
  Slide,
  type SlideProps,
  sizeFor,
} from '@ai-post-recipe/slide-templates'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { renderToStaticMarkup } from 'react-dom/server'

const require = createRequire(import.meta.url)

function fontFace() {
  const file = (subset: string) =>
    readFileSync(
      require.resolve(
        `@fontsource-variable/geist/files/geist-${subset}-wght-normal.woff2`,
      ),
    ).toString('base64')
  return ['latin', 'latin-ext']
    .map(
      (subset) => `@font-face {
  font-family: 'Geist';
  font-weight: 100 900;
  font-display: block;
  src: url(data:font/woff2;base64,${file(subset)}) format('woff2');
}`,
    )
    .join('\n')
}

let fonts: string | undefined

export function slideHtml(props: SlideProps) {
  fonts ??= fontFace()
  const { width, height } = sizeFor(props.format)
  const body = renderToStaticMarkup(createElement(Slide, props))
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
${fonts}
html, body { margin: 0; padding: 0; width: ${width}px; height: ${height}px; background: #111; }
</style></head><body>${body}</body></html>`
}

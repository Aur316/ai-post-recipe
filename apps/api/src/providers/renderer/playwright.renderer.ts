import { type SlideProps, sizeFor } from '@ai-post-recipe/slide-templates'
import { type Browser, chromium } from 'playwright'

import { slideHtml } from './slide-html.js'
import type { SlideRenderer } from './slide-renderer.js'

/**
 * Headless Chromium renders the slide's HTML and takes a screenshot at the
 * exact Instagram size. One browser is started on first use and reused.
 */
export class PlaywrightRenderer implements SlideRenderer {
  private browser?: Promise<Browser>

  async render(props: SlideProps) {
    this.browser ??= chromium.launch()
    const { width, height } = sizeFor(props.format)
    const page = await (
      await this.browser
    ).newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
    })
    try {
      await page.setContent(slideHtml(props), { waitUntil: 'load' })
      // Text must be drawn in Geist, not a fallback font.
      await page.evaluate('document.fonts.ready.then(() => true)')
      return await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width, height },
      })
    } finally {
      await page.close()
    }
  }

  async close() {
    if (this.browser) await (await this.browser).close()
  }
}

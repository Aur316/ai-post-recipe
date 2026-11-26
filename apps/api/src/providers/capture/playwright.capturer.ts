import { type Browser, type Page, chromium } from 'playwright'

import { isPublicUrl } from '../fetcher/web-fetcher.js'
import type { PageCapture, PageCapturer } from './page-capturer.js'
import { PAGE_COLORS_SCRIPT } from './page-colors.js'

const CONSENT =
  /^(accept( all)?( cookies)?|allow all|agree|i agree|got it|ok|prihvati( sve)?|slažem se|elfogad(om|ás)?|összes elfogadása|rendben)$/i

const VIEWPORT = { width: 1440, height: 900 }

export class PlaywrightCapturer implements PageCapturer {
  private browser?: Promise<Browser>

  constructor(private readonly timeoutMs = 20_000) {}

  async capture(url: string): Promise<PageCapture> {
    if (!isPublicUrl(url)) {
      return { images: [], colors: [], error: 'Not a public http(s) address' }
    }
    this.browser ??= chromium.launch()
    const page = await (await this.browser).newPage({ viewport: VIEWPORT })
    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: this.timeoutMs,
      })
      await page
        .waitForLoadState('load', { timeout: 5000 })
        .catch(() => undefined)
      await dismissConsent(page)
      await page.waitForTimeout(1500)
      const colors = await page.evaluate<Array<string>>(PAGE_COLORS_SCRIPT)
      const images: Array<Buffer> = []
      for (const top of await sectionOffsets(page)) {
        await page.evaluate(`window.scrollTo(0, ${top})`)
        await page.waitForTimeout(top === 0 ? 0 : 800)
        images.push(await page.screenshot({ type: 'jpeg', quality: 80 }))
      }
      return { images, colors, error: null }
    } catch (error) {
      const message =
        error instanceof Error ? error.message.split('\n')[0] : String(error)
      return { images: [], colors: [], error: message ?? 'Capture failed' }
    } finally {
      await page.close()
    }
  }

  async close() {
    if (this.browser) await (await this.browser).close()
  }
}

export const MAX_SECTIONS = 3

async function sectionOffsets(page: Page) {
  const height = await page.evaluate<number>(
    'document.documentElement.scrollHeight',
  )
  const last = Math.max(0, height - VIEWPORT.height)
  const offsets = [0, Math.round(last / 2), last]
  return offsets
    .filter(
      (top, i) => i === 0 || top - (offsets[i - 1] ?? 0) > VIEWPORT.height / 2,
    )
    .slice(0, MAX_SECTIONS)
}

async function dismissConsent(page: Page) {
  const button = page.getByRole('button', { name: CONSENT }).first()
  const visible = await button.isVisible({ timeout: 1500 }).catch(() => false)
  if (!visible) return
  await button
    .click({ timeout: 1500 })
    .then(() => page.waitForTimeout(500))
    .catch(() => undefined)
}

import { brandTokens } from '@ai-post-recipe/slide-templates'
import sharp from 'sharp'
import { afterAll, describe, expect, it } from 'vitest'

import { PlaywrightRenderer } from './playwright.renderer.js'
import { slideHtml } from './slide-html.js'

/** A logo that is pure red, easy to find in the PNG. */
const RED_LOGO = `data:image/png;base64,${(
  await sharp({
    create: { width: 300, height: 100, channels: 3, background: '#FF0000' },
  })
    .png()
    .toBuffer()
).toString('base64')}`

const props = {
  format: 'CAROUSEL' as const,
  layout: 'cover' as const,
  text: 'Kreatin: što trebate znati?',
  order: 1,
  total: 3,
  brandName: 'GymBeam',
  tokens: brandTokens([{ hex: '#FF6600' }]),
  logoUrl: RED_LOGO,
}

describe('PlaywrightRenderer', () => {
  const renderer = new PlaywrightRenderer()
  afterAll(() => renderer.close())

  it.each([
    ['CAROUSEL', 1080, 1350],
    ['STORY', 1080, 1920],
  ] as const)('renders a %s slide at %i×%i', async (format, width, height) => {
    const png = await renderer.render({ ...props, format })
    expect(await sharp(png).metadata()).toMatchObject({ width, height })
  })

  it('draws the uploaded logo on the slide', async () => {
    const png = await renderer.render(props)
    const { data, info } = await sharp(png)
      .raw()
      .toBuffer({ resolveWithObject: true })
    let red = 0
    for (let i = 0; i < data.length; i += info.channels) {
      if (data[i] > 240 && data[i + 1] < 15 && data[i + 2] < 15) red++
    }
    // The logo is 64 px high in the header: thousands of red pixels.
    expect(red).toBeGreaterThan(5000)
  })
}, 30_000)

describe('slideHtml', () => {
  it('embeds the font and keeps text as text', () => {
    const html = slideHtml(props)
    expect(html).toContain("font-family: 'Geist'")
    expect(html).toContain('Kreatin: što trebate znati?')
    expect(html).toContain('data-logo')
  })
})

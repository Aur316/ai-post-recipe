/**
 * Runs in the page: counts the colours that visible elements use for their
 * background, text and borders (weighted by area for backgrounds) and the
 * `theme-color` meta tag, and returns the most used ones. Greys, black and
 * white are left out: they say little about a brand.
 */
export const PAGE_COLORS_SCRIPT = `(() => {
  const counts = new Map()
  // Any CSS colour (rgb, oklch, color(), hex) to sRGB: paint one pixel and read it back.
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const cache = new Map()
  const toRgb = (value) => {
    if (cache.has(value)) return cache.get(value)
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = '#000'
    ctx.fillStyle = value
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
    const rgb = a < 128 ? null : [r, g, b]
    cache.set(value, rgb)
    return rgb
  }
  const add = (value, weight) => {
    if (!value || value === 'transparent' || /rgba\\([^)]*,\\s*0\\)$/.test(value)) return
    const rgb = toRgb(value)
    if (!rgb) return
    const [r, g, b] = rgb
    if (Math.max(r, g, b) - Math.min(r, g, b) < 30) return
    // Browser defaults for unstyled links (#0000EE, #551A8B, #EE0000) say nothing about the brand.
    if ((r === 0 && g === 0 && b === 238) || (r === 85 && g === 26 && b === 139) || (r === 238 && g === 0 && b === 0)) return
    const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()
    counts.set(hex, (counts.get(hex) || 0) + weight)
  }
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    const probe = document.createElement('div')
    probe.style.color = meta.getAttribute('content') || ''
    document.body.appendChild(probe)
    add(getComputedStyle(probe).color, 1e9)
    probe.remove()
  }
  for (const el of document.querySelectorAll('body *')) {
    const rect = el.getBoundingClientRect()
    if (rect.width < 4 || rect.height < 4 || rect.top > 3000) continue
    const style = getComputedStyle(el)
    if (style.visibility === 'hidden' || style.display === 'none') continue
    add(style.backgroundColor, Math.min(rect.width * rect.height, 200000) / 1000)
    if (el.childNodes.length && el.textContent && el.textContent.trim()) add(style.color, 20)
    if (el.matches('button, a, [role=button]')) add(style.backgroundColor, 200)
    // Gradients (buttons, headline text): every colour stop counts.
    if (style.backgroundImage && style.backgroundImage.includes('gradient')) {
      const stops = style.backgroundImage.match(/(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\\([^()]*\\)/g) || []
      for (const stop of stops) add(stop, el.matches('button, a, [role=button], h1, h2, h3') ? 300 : 50)
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([hex]) => hex)
})()`

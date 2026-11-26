import { describe, expect, it } from 'vitest'

import { brandImages } from './slides.js'

const upload = (kind: 'UPLOAD_LOGO' | 'UPLOAD_PRODUCT', id: string) => ({
  id,
  kind,
  mimeType: 'image/png',
  data: Buffer.from(id),
})
const shot = (id: string) => ({ data: Buffer.from(id), mimeType: 'image/jpeg' })

describe('brandImages', () => {
  it('uses the uploaded product photos, one per post', () => {
    const uploads = [
      upload('UPLOAD_LOGO', 'logo'),
      upload('UPLOAD_PRODUCT', 'p1'),
      upload('UPLOAD_PRODUCT', 'p2'),
    ]
    expect(brandImages(uploads, 3, [shot('s1')])).toMatchObject({
      logo: { id: 'logo' },
      product: { id: 'p1' },
      frame: 'none',
    })
  })

  it('without product photos shows a different website screenshot per post, in a browser frame', () => {
    const shots = [shot('hero'), shot('features'), shot('pricing')]
    expect(brandImages([], 1, shots)).toMatchObject({
      product: shots[0],
      frame: 'browser',
    })
    expect(brandImages([], 2, shots)).toMatchObject({
      product: shots[1],
      frame: 'browser',
    })
  })

  it('shows no product without photos or screenshots', () => {
    expect(brandImages([], 1, [])).toMatchObject({
      product: undefined,
      frame: 'none',
    })
  })
})

import { describe, expect, it } from 'vitest'

import { brandImages, referenceShot } from './slides.js'

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
    expect(brandImages(uploads, 3)).toMatchObject({
      logo: { id: 'logo' },
      product: { id: 'p1' },
    })
  })

  it('shows no product without product photos', () => {
    expect(brandImages([upload('UPLOAD_LOGO', 'logo')], 1)).toMatchObject({
      logo: { id: 'logo' },
      product: undefined,
    })
  })
})

describe('referenceShot', () => {
  it('gives each post a different website screenshot as input for its background', () => {
    const shots = [shot('hero'), shot('features')]
    expect(referenceShot(shots, 1)).toBe(shots[0])
    expect(referenceShot(shots, 2)).toBe(shots[1])
    expect(referenceShot(shots, 3)).toBe(shots[0])
    expect(referenceShot([], 1)).toBeUndefined()
  })
})

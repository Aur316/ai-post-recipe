import { Brief } from '@ai-post-recipe/shared'
import { describe, expect, it } from 'vitest'

import { gymbeamBrief } from '../../test/fixtures.js'
import { brandImages, referenceShot } from './slides.js'

const upload = (kind: 'UPLOAD_LOGO' | 'UPLOAD_PRODUCT', id: string) => ({
  id,
  kind,
  mimeType: 'image/png',
  data: Buffer.from(id),
})
const shot = (id: string) => ({ data: Buffer.from(id), mimeType: 'image/jpeg' })

describe('brandImages', () => {
  const brief = Brief.parse({
    ...gymbeamBrief(),
    products: [
      { name: 'Just Whey', url: 'https://gymbeam.hr/whey' },
      { name: 'Kreatin monohidrat', url: 'https://gymbeam.hr/kreatin' },
    ],
  })
  const uploads = [
    upload('UPLOAD_LOGO', 'logo'),
    upload('UPLOAD_PRODUCT', 'p1'),
    upload('UPLOAD_PRODUCT', 'p2'),
  ]

  it("picks the photo of the post's own product, in the brief's order", () => {
    expect(
      brandImages(uploads, { brief, index: 1, product: 'Kreatin monohidrat' }),
    ).toMatchObject({ logo: { id: 'logo' }, product: { id: 'p2' } })
    expect(
      brandImages(uploads, { brief, index: 2, product: 'Just Whey i Kreatin' }),
    ).toMatchObject({ product: { id: 'p1' } })
  })

  it('falls back to one photo per post when the product is not in the brief', () => {
    expect(
      brandImages(uploads, { brief, index: 3, product: 'Shaker' }),
    ).toMatchObject({ product: { id: 'p1' } })
  })

  it('shows no product without product photos', () => {
    expect(
      brandImages([upload('UPLOAD_LOGO', 'logo')], { brief, index: 1 }),
    ).toMatchObject({
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

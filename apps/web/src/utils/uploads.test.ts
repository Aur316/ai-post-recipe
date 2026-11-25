import { guessKind, rejectReason } from '@/utils/uploads'

const file = (name: string, type: string, size = 10) =>
  new File([new Uint8Array(size)], name, { type })

describe('upload rules', () => {
  it('rejects unsupported types and files over 10 MB', () => {
    expect(rejectReason(file('a.pdf', 'application/pdf'), 'UPLOAD_OTHER')).toBe(
      'Only PNG, JPEG, WebP or SVG files',
    )
    expect(
      rejectReason(
        file('a.png', 'image/png', 10 * 1024 * 1024 + 1),
        'UPLOAD_PRODUCT',
      ),
    ).toBe('Larger than 10 MB')
  })

  it('allows SVG only for logos', () => {
    const svg = file('mark.svg', 'image/svg+xml')
    expect(rejectReason(svg, 'UPLOAD_PRODUCT')).toBe(
      'SVG is only allowed for logos',
    )
    expect(rejectReason(svg, 'UPLOAD_LOGO')).toBeUndefined()
  })

  it('guesses the kind from the file', () => {
    expect(guessKind(file('brand-logo.png', 'image/png'))).toBe('UPLOAD_LOGO')
    expect(guessKind(file('Screenshot 1.png', 'image/png'))).toBe(
      'UPLOAD_SCREENSHOT',
    )
    expect(guessKind(file('whey.jpg', 'image/jpeg'))).toBe('UPLOAD_PRODUCT')
  })
})

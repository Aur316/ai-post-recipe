import sharp from 'sharp'

import type { PageCapture, PageCapturer } from './page-capturer.js'

export class FakeCapturer implements PageCapturer {
  readonly captured: Array<string> = []

  constructor(
    private readonly pages: Record<string, Partial<PageCapture>> = {},
  ) {}

  async capture(url: string): Promise<PageCapture> {
    this.captured.push(url)
    const image = await sharp({
      create: { width: 1440, height: 900, channels: 3, background: '#333333' },
    })
      .jpeg()
      .toBuffer()
    return {
      images: [image, image],
      colors: ['#7C3AED'],
      error: null,
      ...this.pages[url],
    }
  }

  close() {
    return Promise.resolve()
  }
}

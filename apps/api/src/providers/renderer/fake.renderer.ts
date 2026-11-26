import { type SlideProps, sizeFor } from '@ai-post-recipe/slide-templates'
import sharp from 'sharp'

import type { SlideRenderer } from './slide-renderer.js'

export class FakeRenderer implements SlideRenderer {
  readonly rendered: Array<SlideProps> = []

  render(props: SlideProps) {
    this.rendered.push(props)
    const { width, height } = sizeFor(props.format)
    return sharp({
      create: { width, height, channels: 3, background: '#111111' },
    })
      .png()
      .toBuffer()
  }

  close() {
    return Promise.resolve()
  }
}

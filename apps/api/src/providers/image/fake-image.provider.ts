import sharp from 'sharp'

import { type LlmUsage, NO_USAGE } from '../llm/llm.provider.js'
import type {
  ImageProvider,
  ImageRequest,
  ImageResult,
} from './image.provider.js'

/** A plain gradient instead of a generated image: no key, no cost. */
export class FakeImageProvider implements ImageProvider {
  readonly name = 'fake'
  readonly requests: Array<ImageRequest> = []

  constructor(private readonly usage: LlmUsage = NO_USAGE) {}

  async generate(request: ImageRequest): Promise<ImageResult> {
    this.requests.push(request)
    const [w = 4, h = 5] = request.aspectRatio.split(':').map(Number)
    const width = 540
    const height = Math.round((width * h) / w)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3f3f46"/><stop offset="1" stop-color="#18181b"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`
    return {
      data: await sharp(Buffer.from(svg)).png().toBuffer(),
      mimeType: 'image/png',
      model: 'fake',
      usage: this.usage,
    }
  }
}

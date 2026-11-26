import type { SlideProps } from '@ai-post-recipe/slide-templates'

/** Turns a slide template with its props into a PNG at the exact size. */
export interface SlideRenderer {
  render(props: SlideProps): Promise<Buffer>
  close(): Promise<void>
}

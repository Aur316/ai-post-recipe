import type { SlideProps } from '@ai-post-recipe/slide-templates'

export interface SlideRenderer {
  render(props: SlideProps): Promise<Buffer>
  close(): Promise<void>
}

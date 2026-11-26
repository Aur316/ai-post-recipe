export interface PageCapture {
  /** JPEGs of the page from top to bottom (at most MAX_SECTIONS); empty when it failed. */
  images: Array<Buffer>
  /** The colours the page's own styles use most, as #RRGGBB. */
  colors: Array<string>
  error: string | null
}

/** Takes a screenshot of a web page and reads the colours it uses. */
export interface PageCapturer {
  capture(url: string): Promise<PageCapture>
  close(): Promise<void>
}

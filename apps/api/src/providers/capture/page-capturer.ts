export interface PageCapture {
  images: Array<Buffer>
  colors: Array<string>
  error: string | null
}

export interface PageCapturer {
  capture(url: string): Promise<PageCapture>
  close(): Promise<void>
}

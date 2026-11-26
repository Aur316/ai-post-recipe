import type { Readable } from 'node:stream'

export interface StoredObject {
  body: Readable
  contentType?: string
  contentLength?: number
}

export interface StorageProvider {
  ensureBucket(): Promise<void>
  put(key: string, body: Buffer, contentType: string): Promise<void>
  get(key: string): Promise<StoredObject>
  delete(key: string): Promise<void>
  ping(): Promise<boolean>
}

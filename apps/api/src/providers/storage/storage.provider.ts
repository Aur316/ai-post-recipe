import type { Readable } from 'node:stream'

export interface StoredObject {
  body: Readable
  contentType?: string
  contentLength?: number
}

export interface StorageProvider {
  /** Creates the bucket if it does not exist yet. */
  ensureBucket(): Promise<void>
  put(key: string, body: Buffer, contentType: string): Promise<void>
  get(key: string): Promise<StoredObject>
  delete(key: string): Promise<void>
  /** True when the storage is reachable and the bucket exists. */
  ping(): Promise<boolean>
}

import { Readable } from 'node:stream'

import type { StorageProvider } from './storage.provider.js'

export class MemoryStorage implements StorageProvider {
  readonly objects = new Map<string, { body: Buffer; contentType: string }>()

  ensureBucket() {
    return Promise.resolve()
  }

  put(key: string, body: Buffer, contentType: string) {
    this.objects.set(key, { body, contentType })
    return Promise.resolve()
  }

  get(key: string) {
    const object = this.objects.get(key)
    if (!object) return Promise.reject(new Error(`No object ${key}`))
    return Promise.resolve({
      body: Readable.from(object.body),
      contentType: object.contentType,
      contentLength: object.body.length,
    })
  }

  delete(key: string) {
    this.objects.delete(key)
    return Promise.resolve()
  }

  ping() {
    return Promise.resolve(true)
  }
}

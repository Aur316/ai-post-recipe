import {
  MAX_UPLOAD_BYTES,
  UPLOAD_MIME_TYPES,
  type UploadAssetKind,
} from '@ai-post-recipe/shared'

export interface PendingUpload {
  id: string
  file: File
  kind: UploadAssetKind
  previewUrl: string
  progress: number
  status: 'ready' | 'uploading' | 'done' | 'failed'
  error?: string
}

export const UPLOAD_KIND_LABELS: Record<UploadAssetKind, string> = {
  UPLOAD_SCREENSHOT: 'Instagram screenshot',
  UPLOAD_PRODUCT: 'Product photo',
  UPLOAD_LOGO: 'Logo',
  UPLOAD_OTHER: 'Other reference',
}

/** Same rules as the API, so the user sees the reason before uploading. */
export const rejectReason = (file: File, kind: UploadAssetKind) => {
  if (!(UPLOAD_MIME_TYPES as ReadonlyArray<string>).includes(file.type)) {
    return 'Only PNG, JPEG, WebP or SVG files'
  }
  if (file.type === 'image/svg+xml' && kind !== 'UPLOAD_LOGO') {
    return 'SVG is only allowed for logos'
  }
  if (file.size > MAX_UPLOAD_BYTES) return 'Larger than 10 MB'
  return undefined
}

export const guessKind = (file: File): UploadAssetKind => {
  const name = file.name.toLowerCase()
  if (file.type === 'image/svg+xml' || name.includes('logo'))
    return 'UPLOAD_LOGO'
  if (name.includes('screen')) return 'UPLOAD_SCREENSHOT'
  return 'UPLOAD_PRODUCT'
}

export const toPendingUpload = (file: File): PendingUpload => ({
  id: crypto.randomUUID(),
  file,
  kind: guessKind(file),
  previewUrl: URL.createObjectURL(file),
  progress: 0,
  status: 'ready',
})

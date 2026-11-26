import {
  MAX_UPLOAD_BYTES,
  type StyleSource,
  UPLOAD_MIME_TYPES,
  UploadAssetKind,
} from '@ai-post-recipe/shared'

import i18n from '@/i18n'

export interface PendingUpload {
  id: string
  file: File
  kind: UploadAssetKind
  previewUrl: string
  progress: number
  status: 'ready' | 'uploading' | 'done' | 'failed'
  error?: string
}

export const WEBSITE_MODE_KINDS: ReadonlyArray<UploadAssetKind> = [
  'UPLOAD_LOGO',
  'UPLOAD_PRODUCT',
]

export const allowedKinds = (
  styleSource: StyleSource,
): ReadonlyArray<UploadAssetKind> =>
  styleSource === 'WEBSITE' ? WEBSITE_MODE_KINDS : UploadAssetKind.options

export const rejectReason = (
  file: File,
  kind: UploadAssetKind,
  styleSource: StyleSource = 'UPLOADS',
) => {
  if (!allowedKinds(styleSource).includes(kind)) {
    return i18n.t('uploader.notInWebsiteMode')
  }
  if (!(UPLOAD_MIME_TYPES as ReadonlyArray<string>).includes(file.type)) {
    return i18n.t('uploader.onlyImages')
  }
  if (file.type === 'image/svg+xml' && kind !== 'UPLOAD_LOGO') {
    return i18n.t('uploader.svgOnlyLogo')
  }
  if (file.size > MAX_UPLOAD_BYTES) return i18n.t('uploader.tooLarge')
  return undefined
}

export const guessKind = (
  file: File,
  styleSource: StyleSource = 'UPLOADS',
): UploadAssetKind => {
  const name = file.name.toLowerCase()
  if (file.type === 'image/svg+xml' || name.includes('logo'))
    return 'UPLOAD_LOGO'
  if (name.includes('screen') && styleSource === 'UPLOADS')
    return 'UPLOAD_SCREENSHOT'
  return 'UPLOAD_PRODUCT'
}

export const toPendingUpload = (
  file: File,
  styleSource: StyleSource = 'UPLOADS',
): PendingUpload => ({
  id: crypto.randomUUID(),
  file,
  kind: guessKind(file, styleSource),
  previewUrl: URL.createObjectURL(file),
  progress: 0,
  status: 'ready',
})

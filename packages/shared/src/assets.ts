import { z } from 'zod'

export const UploadAssetKind = z.enum([
  'UPLOAD_SCREENSHOT',
  'UPLOAD_PRODUCT',
  'UPLOAD_LOGO',
  'UPLOAD_OTHER',
])

export type UploadAssetKind = z.infer<typeof UploadAssetKind>

export const AssetKind = z.enum([
  ...UploadAssetKind.options,
  'GENERATED_BACKGROUND',
  'RENDERED_SLIDE',
  'EXPORT_ZIP',
  'CAPTURED_SCREENSHOT',
])

export type AssetKind = z.infer<typeof AssetKind>

export const UploadAssetBody = z.object({ kind: UploadAssetKind })

export type UploadAssetBody = z.infer<typeof UploadAssetBody>

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export const UPLOAD_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
] as const

export const AssetDto = z.object({
  id: z.uuid(),
  runId: z.uuid(),
  kind: AssetKind,
  mimeType: z.string(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  sizeBytes: z.number().int(),
  createdAt: z.iso.datetime(),
})

export type AssetDto = z.infer<typeof AssetDto>

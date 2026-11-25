import type { AssetDto, UploadAssetKind } from '@ai-post-recipe/shared'

import { httpClient } from '@/clients/http'

export interface UploadAssetRequest {
  runId: string
  file: File
  kind: UploadAssetKind
  onProgress?: (percent: number) => void
}

export const assetsQueryFunctions = {
  upload: ({
    runId,
    file,
    kind,
    onProgress,
  }: UploadAssetRequest): Promise<AssetDto> => {
    const formData = new FormData()
    formData.append('kind', kind)
    formData.append('file', file)
    return httpClient.post(`/api/runs/${runId}/assets`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e.total) onProgress?.(Math.round((e.loaded / e.total) * 100))
      },
    })
  },
  url: (id: string) => `/api/assets/${id}`,
}

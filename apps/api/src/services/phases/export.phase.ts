import { ExportOutput } from '@ai-post-recipe/shared'

import type { Phase } from './phase.js'

/** Builds the hand-over ZIP and keeps it as an asset of the run. */
export const exportPhase: Phase<'EXPORT'> = {
  key: 'EXPORT',
  outputSchema: ExportOutput,
  execute: async (ctx) => {
    const zip = await ctx.buildExport()
    const assetId = await ctx.saveAsset(
      'EXPORT_ZIP',
      zip.data,
      'application/zip',
    )
    return { output: { assetId, files: zip.files } }
  },
}

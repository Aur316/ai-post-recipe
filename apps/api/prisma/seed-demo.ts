import { Brief, type UploadAssetKind } from '@ai-post-recipe/shared'
import { existsSync } from 'node:fs'
import { readFileSync, readdirSync } from 'node:fs'
import { extname, join } from 'node:path'

import { loadEnv } from '../src/config/env.js'
import { createDb } from '../src/db/prisma.js'
import { S3Storage } from '../src/providers/storage/s3.storage.js'
import { AssetRepo } from '../src/repositories/asset/asset.repo.js'
import { RunRepo } from '../src/repositories/run/run.repo.js'
import { AssetService } from '../src/services/asset/asset.service.js'

const EXAMPLE = join(import.meta.dirname, '../../../examples/gymbeam')

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}

const kindOf = (file: string): UploadAssetKind => {
  const name = file.toLowerCase()
  if (name.startsWith('logo')) return 'UPLOAD_LOGO'
  if (name.startsWith('product')) return 'UPLOAD_PRODUCT'
  if (name.startsWith('screenshot')) return 'UPLOAD_SCREENSHOT'
  return 'UPLOAD_OTHER'
}

if (existsSync('../../.env')) process.loadEnvFile('../../.env')
const env = loadEnv()
const db = createDb(env.DATABASE_URL)
const storage = new S3Storage({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  bucket: env.S3_BUCKET,
  accessKeyId: env.S3_ACCESS_KEY,
  secretAccessKey: env.S3_SECRET_KEY,
})

try {
  const brief = Brief.parse(
    JSON.parse(readFileSync(join(EXAMPLE, 'brief.json'), 'utf8')),
  )
  const run = await new RunRepo(db).create({
    brandName: brief.brandName,
    instagram: brief.instagramUrl,
    language: brief.language,
    brief,
  })

  await storage.ensureBucket()
  const assets = new AssetService(new RunRepo(db), new AssetRepo(db), storage)
  const files = readdirSync(join(EXAMPLE, 'references'))
    .filter((f) => MIME[extname(f).toLowerCase()])
    .sort()
  for (const file of files) {
    await assets.upload({
      runId: run.id,
      kind: kindOf(file),
      mimeType: MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
      buffer: readFileSync(join(EXAMPLE, 'references', file)),
    })
    console.log(`Uploaded ${file} as ${kindOf(file)}`)
  }
  console.log(
    `GymBeam demo run created with ${files.length} references: ${run.id}`,
  )
  if (files.length === 0) {
    console.log(
      'No reference images yet: see examples/gymbeam/references/README.md',
    )
  }
} finally {
  await db.$disconnect()
}

/**
 * Development seed: draft runs for trying the runs list and its pagination.
 *
 *   pnpm seed        # 30 runs
 *   pnpm seed 50     # any other number
 *
 * Re-running replaces the earlier seed runs (brand names starting with
 * "Seed brand"); other runs are left alone.
 */
import { Brief } from '@ai-post-recipe/shared'

import { createDb } from '../src/db/prisma.js'

const PREFIX = 'Seed brand'
const count = Number(process.argv[2] ?? 30)

try {
  process.loadEnvFile('../../.env')
} catch {
  // Variables come from the environment.
}

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set')
if (!Number.isInteger(count) || count < 1) {
  throw new Error(`Invalid count: ${process.argv[2]}`)
}

const db = createDb(url)

const brief = (brandName: string) =>
  Brief.parse({
    brandName,
    instagramUrl: 'https://www.instagram.com/gymbeamhr/',
    reason: 'Seed data for trying the runs list.',
    links: [{ type: 'SHOP', url: 'https://gymbeam.hr' }],
    products: [{ name: 'True Whey', url: 'https://gymbeam.hr' }],
    audience: 'Active adults 18–35 in Croatia',
    goals: 'More saves and product interest',
    language: 'hr',
  })

try {
  const { count: removed } = await db.run.deleteMany({
    where: { brandName: { startsWith: PREFIX } },
  })

  const now = Date.now()
  const width = String(count).length
  await db.run.createMany({
    data: Array.from({ length: count }, (_, i) => {
      const brandName = `${PREFIX} ${String(i + 1).padStart(width, '0')}`
      const value = brief(brandName)
      return {
        brandName,
        instagram: value.instagramUrl,
        language: value.language,
        brief: value,
        // One minute apart, so "Seed brand 01" is the oldest.
        createdAt: new Date(now - (count - i) * 60_000),
      }
    }),
  })

  console.log(`Seed: removed ${removed} old seed runs, created ${count}.`)
} finally {
  await db.$disconnect()
}

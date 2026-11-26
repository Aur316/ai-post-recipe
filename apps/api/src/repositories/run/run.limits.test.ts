import { BRIEF_LIMITS } from '@ai-post-recipe/shared'
import { describe, expect, it } from 'vitest'

import { createTestContext } from '../../test/context.js'
import { RunRepo } from './run.repo.js'

describe('Run length limits in the database', () => {
  const ctx = createTestContext()
  const runs = new RunRepo(ctx.db)

  const columnLength = async (column: string) => {
    const [row] = await ctx.db.$queryRaw<
      Array<{ length: number }>
    >`SELECT character_maximum_length AS length FROM information_schema.columns
      WHERE table_name = 'Run' AND column_name = ${column}`
    return row?.length
  }

  const insert = async (brief: object, brandName = 'Brand') => {
    const run = await runs.create({
      brandName,
      instagram: 'https://www.instagram.com/x',
      brief,
    })
    ctx.track(run.id)
  }

  it('limits the brand name and Instagram URL columns', async () => {
    expect(await columnLength('brandName')).toBe(BRIEF_LIMITS.brandName)
    expect(await columnLength('instagram')).toBe(BRIEF_LIMITS.url)
  })

  it.each(['reason', 'audience', 'goals', 'inspiration'] as const)(
    'accepts %s at the limit and rejects one character more',
    async (field) => {
      const max = BRIEF_LIMITS[field]
      await expect(
        insert({ [field]: 'a'.repeat(max) }),
      ).resolves.toBeUndefined()
      await expect(insert({ [field]: 'a'.repeat(max + 1) })).rejects.toThrow()
    },
  )

  it('limits product names inside the brief', async () => {
    const max = BRIEF_LIMITS.productName
    await expect(
      insert({ products: [{ name: 'a'.repeat(max) }] }),
    ).resolves.toBeUndefined()
    await expect(
      insert({ products: [{ name: 'a'.repeat(max + 1) }] }),
    ).rejects.toThrow()
  })
})

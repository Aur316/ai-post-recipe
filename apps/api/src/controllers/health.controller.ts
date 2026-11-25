import type { HealthResponse } from '@ai-post-recipe/shared'
import type { Request, Response } from 'express'

import type { Db } from '../db/prisma.js'
import type { StorageProvider } from '../providers/storage/storage.provider.js'

export class HealthController {
  constructor(
    private readonly db: Db,
    private readonly storage: StorageProvider,
  ) {}

  check = async (_req: Request, res: Response) => {
    const [database, storage] = await Promise.all([
      this.db.$queryRaw`SELECT 1`.then(
        () => true,
        () => false,
      ),
      this.storage.ping(),
    ])
    const ok = database && storage
    const body: HealthResponse = {
      status: ok ? 'ok' : 'degraded',
      checks: { database, storage },
    }
    res.status(ok ? 200 : 503).json(body)
  }
}

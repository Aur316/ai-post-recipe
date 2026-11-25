import { execSync } from 'node:child_process'
import pg from 'pg'

import {
  loadDotEnv,
  requireDatabaseUrl,
  testDatabaseUrl,
} from './database-url.js'

/** Runs once before all API tests: creates the test database and migrates it. */
export default async function setup() {
  loadDotEnv()
  const baseUrl = requireDatabaseUrl()
  const testUrl = testDatabaseUrl(baseUrl)
  const name = new URL(testUrl).pathname.slice(1)

  const client = new pg.Client({ connectionString: baseUrl })
  await client.connect()
  try {
    const { rowCount } = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [name],
    )
    if (!rowCount) await client.query(`CREATE DATABASE "${name}"`)
  } finally {
    await client.end()
  }

  execSync('pnpm exec prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: 'ignore',
  })
}

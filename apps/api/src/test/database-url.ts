import { existsSync } from 'node:fs'

export function testDatabaseUrl(databaseUrl: string) {
  const url = new URL(databaseUrl)
  const name = url.pathname.slice(1)
  if (!name.endsWith('_test')) url.pathname = `/${name}_test`
  return url.toString()
}

export function loadDotEnv() {
  if (existsSync('../../.env')) process.loadEnvFile('../../.env')
}

export function requireDatabaseUrl() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required for API tests')
  return url
}

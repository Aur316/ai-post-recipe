/** Points the given connection string at a separate `<name>_test` database. */
export function testDatabaseUrl(databaseUrl: string) {
  const url = new URL(databaseUrl)
  const name = url.pathname.slice(1)
  if (!name.endsWith('_test')) url.pathname = `/${name}_test`
  return url.toString()
}

export function loadDotEnv() {
  try {
    process.loadEnvFile('../../.env')
  } catch {
    // CI provides the variables directly.
  }
}

export function requireDatabaseUrl() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required for API tests')
  return url
}

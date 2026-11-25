import {
  loadDotEnv,
  requireDatabaseUrl,
  testDatabaseUrl,
} from './database-url.js'

loadDotEnv()
process.env.DATABASE_URL = testDatabaseUrl(requireDatabaseUrl())

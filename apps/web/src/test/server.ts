import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

/** Handlers every test gets; a test adds its own with `server.use`. */
export const server = setupServer(
  http.get('/api/health', () =>
    HttpResponse.json({
      status: 'ok',
      checks: { database: true, storage: true },
      providers: { llm: 'openrouter', search: 'serper' },
    }),
  ),
)

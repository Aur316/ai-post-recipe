import { z } from 'zod'

import type {
  SearchOptions,
  SearchProvider,
  SearchResult,
} from './search.provider.js'

const SerperResponse = z.object({
  organic: z
    .array(
      z.object({
        title: z.string(),
        link: z.string(),
        snippet: z.string().optional(),
      }),
    )
    .default([]),
})

export class SerperProvider implements SearchProvider {
  readonly name = 'serper'

  constructor(
    private readonly apiKey: string,
    private readonly fetchFn: typeof fetch = globalThis.fetch,
    private readonly timeoutMs = 15_000,
  ) {}

  async search(
    query: string,
    { language, country, limit = 5 }: SearchOptions = {},
  ): Promise<Array<SearchResult>> {
    const response = await this.fetchFn('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, hl: language, gl: country, num: limit }),
      signal: AbortSignal.timeout(this.timeoutMs),
    })
    if (!response.ok) {
      throw new Error(`Serper ${response.status}: ${response.statusText}`)
    }
    const { organic } = SerperResponse.parse(await response.json())
    return organic.slice(0, limit).map((r) => ({
      title: r.title,
      url: r.link,
      snippet: r.snippet ?? '',
    }))
  }
}

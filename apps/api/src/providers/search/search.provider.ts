export interface SearchResult {
  title: string
  url: string
  snippet: string
}

export interface SearchOptions {
  /** Interface language of the results, e.g. "hr". */
  language?: string
  /** Country to search from, e.g. "hr". */
  country?: string
  limit?: number
}

/** Web search for the research phase. */
export interface SearchProvider {
  readonly name: 'serper' | 'none'
  search(query: string, options?: SearchOptions): Promise<Array<SearchResult>>
}

/** Used without a SERPER_API_KEY: research then reads only the brief's links. */
export class NoopSearchProvider implements SearchProvider {
  readonly name = 'none'
  search() {
    return Promise.resolve([])
  }
}

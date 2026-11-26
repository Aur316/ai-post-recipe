export interface SearchResult {
  title: string
  url: string
  snippet: string
}

export interface SearchOptions {
  language?: string
  country?: string
  limit?: number
}

export interface SearchProvider {
  readonly name: 'serper' | 'none'
  search(query: string, options?: SearchOptions): Promise<Array<SearchResult>>
}

export class NoopSearchProvider implements SearchProvider {
  readonly name = 'none'
  search() {
    return Promise.resolve([])
  }
}

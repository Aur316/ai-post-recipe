import { describe, expect, it } from 'vitest'

import { SerperProvider } from './serper.provider.js'

describe('SerperProvider', () => {
  it('sends the query with the key and maps the organic results', async () => {
    let sent: { url: string; init?: RequestInit } | undefined
    const fn = ((url: string, init?: RequestInit) => {
      sent = { url, init }
      return Promise.resolve(
        Response.json({
          organic: [
            { title: 'GymBeam', link: 'https://gymbeam.hr', snippet: 'Shop' },
            { title: 'No snippet', link: 'https://gymbeam.hr/blog' },
          ],
        }),
      )
    }) as typeof fetch

    const results = await new SerperProvider('serper-key', fn).search(
      'GymBeam',
      {
        language: 'hr',
        country: 'hr',
        limit: 4,
      },
    )

    expect(results).toEqual([
      { title: 'GymBeam', url: 'https://gymbeam.hr', snippet: 'Shop' },
      { title: 'No snippet', url: 'https://gymbeam.hr/blog', snippet: '' },
    ])
    expect(sent?.url).toBe('https://google.serper.dev/search')
    expect(new Headers(sent?.init?.headers).get('X-API-KEY')).toBe('serper-key')
    expect(JSON.parse(sent?.init?.body as string)).toEqual({
      q: 'GymBeam',
      hl: 'hr',
      gl: 'hr',
      num: 4,
    })
  })

  it('fails on an error status', async () => {
    const fn = (() =>
      Promise.resolve(
        new Response('', { status: 403, statusText: 'Forbidden' }),
      )) as typeof fetch
    await expect(new SerperProvider('k', fn).search('x')).rejects.toThrow(
      'Serper 403: Forbidden',
    )
  })
})

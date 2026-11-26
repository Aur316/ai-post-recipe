import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { htmlToText } from './html-text.js'
import { parseRobots } from './robots.js'
import { WebFetcher, isPublicUrl } from './web-fetcher.js'

const SHOP_HTML = readFileSync(
  new URL('../../test/fixtures/shop-page.html', import.meta.url),
  'utf8',
)

interface Route {
  status?: number
  body?: string
  headers?: Record<string, string>
}

/** A fetch that answers from a table of URLs; unknown URLs are 404. */
function fakeFetch(routes: Record<string, Route>) {
  const calls: Array<string> = []
  const fn = (input: string) => {
    const url = input
    calls.push(url)
    const route = routes[url] ?? { status: 404, body: '' }
    return Promise.resolve(
      new Response(route.body ?? '', {
        status: route.status ?? 200,
        headers: route.headers ?? {
          'content-type': 'text/html; charset=utf-8',
        },
      }),
    )
  }
  return { fn: fn as unknown as typeof fetch, calls }
}

describe('htmlToText', () => {
  it('keeps the title, description and main text, without scripts and navigation', () => {
    const page = htmlToText(SHOP_HTML)

    expect(page.title).toBe('Proteini | Primjer Shop')
    expect(page.description).toBe(
      'Proteini i dodaci prehrani & oprema za trening.',
    )
    expect(page.text).toContain('True Whey protein')
    expect(page.text).toContain('Sirutkin protein s 24 g proteina po porciji.')
    expect(page.text).toContain('Pakiranje 1000 g')
    expect(page.text).not.toContain('tracking')
    expect(page.text).not.toContain('Akcije')
    expect(page.text).not.toContain('© Primjer Shop')
    expect(page.text).not.toContain('JavaScript')
  })
})

describe('parseRobots', () => {
  const robots = `
User-agent: *
Disallow: /checkout
Allow: /checkout/help

User-agent: AIPostRecipe
Disallow: /private
Disallow: /*.pdf$
`

  it('uses the group for our agent, else the * group', () => {
    const ours = parseRobots(robots, 'AIPostRecipe/1.0')
    expect(ours('/private/page')).toBe(false)
    expect(ours('/checkout')).toBe(true)
    expect(ours('/files/a.pdf')).toBe(false)

    const other = parseRobots(robots, 'OtherBot')
    expect(other('/checkout/cart')).toBe(false)
    expect(other('/checkout/help')).toBe(true)
    expect(other('/products')).toBe(true)
  })
})

describe('isPublicUrl', () => {
  it.each([
    ['https://gymbeam.hr/proteini', true],
    ['http://localhost:3000/api', false],
    ['http://127.0.0.1/', false],
    ['http://192.168.1.10/', false],
    ['http://[::1]/', false],
    ['ftp://example.com/', false],
    ['not a url', false],
  ])('%s → %s', (url, expected) => {
    expect(isPublicUrl(url)).toBe(expected)
  })
})

describe('WebFetcher', () => {
  it('reads a page', async () => {
    const { fn } = fakeFetch({ 'https://shop.example/p': { body: SHOP_HTML } })
    const page = await new WebFetcher({ fetch: fn }).fetchPage(
      'https://shop.example/p',
    )

    expect(page).toMatchObject({
      reachable: true,
      error: null,
      title: 'Proteini | Primjer Shop',
    })
    expect(page.text).toContain('24 g proteina')
  })

  it('respects robots.txt', async () => {
    const { fn, calls } = fakeFetch({
      'https://shop.example/robots.txt': {
        body: 'User-agent: *\nDisallow: /private',
        headers: { 'content-type': 'text/plain' },
      },
    })
    const page = await new WebFetcher({ fetch: fn }).fetchPage(
      'https://shop.example/private/x',
    )

    expect(page).toMatchObject({
      reachable: false,
      error: 'Blocked by robots.txt',
    })
    expect(calls).not.toContain('https://shop.example/private/x')
  })

  it('follows redirects and checks every hop', async () => {
    const { fn } = fakeFetch({
      'https://shop.example/old': {
        status: 301,
        headers: { location: '/new' },
      },
      'https://shop.example/new': { body: SHOP_HTML },
      'https://evil.example/go': {
        status: 302,
        headers: { location: 'http://127.0.0.1/admin' },
      },
    })
    const fetcher = new WebFetcher({ fetch: fn })

    expect(
      (await fetcher.fetchPage('https://shop.example/old')).reachable,
    ).toBe(true)
    expect(await fetcher.fetchPage('https://evil.example/go')).toMatchObject({
      reachable: false,
      error: 'Not a public http(s) address',
    })
  })

  it.each([
    ['an HTTP error', { status: 404 }, 'HTTP 404'],
    [
      'a file that is not a page',
      { headers: { 'content-type': 'application/pdf' } },
      'Not a web page (application/pdf)',
    ],
  ])('reports %s', async (_, route: Route, error) => {
    const { fn } = fakeFetch({
      'https://shop.example/x': { body: '%PDF', ...route },
    })
    expect(
      await new WebFetcher({ fetch: fn }).fetchPage('https://shop.example/x'),
    ).toMatchObject({
      reachable: false,
      error,
    })
  })

  it('reports a network error instead of throwing', async () => {
    const fn = (() =>
      Promise.reject(new Error('getaddrinfo ENOTFOUND'))) as typeof fetch
    expect(
      await new WebFetcher({ fetch: fn }).fetchPage('https://nope.example/'),
    ).toMatchObject({
      reachable: false,
      error: 'getaddrinfo ENOTFOUND',
    })
  })
})

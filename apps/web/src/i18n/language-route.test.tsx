import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'

import { withLanguage } from '@/i18n'
import { renderRoute } from '@/test/render'
import { server } from '@/test/server'

const emptyList = () =>
  server.use(
    http.get('/api/runs', () =>
      HttpResponse.json({
        items: [],
        total: 0,
        page: 1,
        size: 20,
        totalPages: 0,
      }),
    ),
  )

describe('withLanguage', () => {
  it.each([
    ['/', 'hr', '/hr'],
    ['/en', 'hr', '/hr'],
    ['/en/runs/1/edit', 'hr', '/hr/runs/1/edit'],
    ['/runs/1', 'en', '/en/runs/1'],
    ['/?search=rev', 'hr', '/hr?search=rev'],
    ['/en/runs?search=a#top', 'hr', '/hr/runs?search=a#top'],
  ] as const)('%s in %s is %s', (path, language, expected) => {
    expect(withLanguage(path, language)).toBe(expected)
  })
})

describe('Language in the URL', () => {
  beforeEach(emptyList)

  it('sends / to the preferred language', async () => {
    const router = renderRoute('/')
    await waitFor(() => expect(router.state.location.pathname).toBe('/en'))
  })

  it('uses the saved language for a link without one', async () => {
    localStorage.setItem('language', 'hr')
    const router = renderRoute('/runs/new?x=1')

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/hr/runs/new'),
    )
    expect(router.state.location.search).toBe('?x=1')
    expect(
      await screen.findByRole('heading', { name: 'Novo pokretanje' }),
    ).toBeInTheDocument()
  })

  it('opens the same page in the other language', async () => {
    const user = userEvent.setup()
    const router = renderRoute('/en/runs/new')

    await user.click(await screen.findByRole('button', { name: 'HR' }))

    expect(router.state.location.pathname).toBe('/hr/runs/new')
    expect(
      await screen.findByRole('heading', { name: 'Novo pokretanje' }),
    ).toBeInTheDocument()
  })

  it('links the language versions for search engines', async () => {
    renderRoute('/hr/runs/new')
    await screen.findByRole('heading', { name: 'Novo pokretanje' })

    const href = (selector: string) =>
      document.head.querySelector(selector)?.getAttribute('href')
    const origin = window.location.origin
    expect(href('link[rel="canonical"]')).toBe(`${origin}/hr/runs/new`)
    expect(href('link[hreflang="en"]')).toBe(`${origin}/en/runs/new`)
    expect(href('link[hreflang="hr"]')).toBe(`${origin}/hr/runs/new`)
    expect(href('link[hreflang="x-default"]')).toBe(`${origin}/en/runs/new`)
    expect(document.documentElement.lang).toBe('hr')
  })
})

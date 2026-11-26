import { DEFAULT_PAGE_SIZE } from '@ai-post-recipe/shared'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'

import { renderRoute } from '@/test/render'
import { server } from '@/test/server'

const run = (id: string, brandName: string, status = 'DRAFT') => ({
  id,
  brandName,
  instagram: 'https://www.instagram.com/gymbeamhr/',
  language: 'hr',
  status,
  createdAt: '2026-11-25T10:00:00.000Z',
  updatedAt: '2026-11-25T10:00:00.000Z',
  usage: { costUsd: 0.7593, tokensIn: 98_000, tokensOut: 17_000 },
})

const page = (
  items: Array<ReturnType<typeof run>>,
  p: number,
  totalPages: number,
) => ({
  items,
  total: totalPages,
  page: p,
  size: DEFAULT_PAGE_SIZE,
  totalPages,
})

describe('Runs page', () => {
  it('requests the first page with the default size and links to each run', async () => {
    const queries: Array<string> = []
    server.use(
      http.get('/api/runs', ({ request }) => {
        queries.push(new URL(request.url).search)
        return HttpResponse.json(page([run('r1', 'GymBeam Hrvatska')], 1, 1))
      }),
    )
    renderRoute('/en')

    const link = await screen.findByRole('link', { name: /GymBeam Hrvatska/ })
    expect(link).toHaveAttribute('href', '/en/runs/r1')
    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(queries).toEqual([`?page=1&size=${DEFAULT_PAGE_SIZE}`])
  })

  it('loads the next page when the end of the list comes into view', async () => {
    server.use(
      http.get('/api/runs', ({ request }) => {
        const p = Number(new URL(request.url).searchParams.get('page'))
        return HttpResponse.json(
          p === 1
            ? page([run('r2', 'Newer brand')], 1, 2)
            : page([run('r1', 'Older brand')], 2, 2),
        )
      }),
    )
    renderRoute('/en')

    expect(await screen.findByText('Newer brand')).toBeInTheDocument()
    expect(await screen.findByText('Older brand')).toBeInTheDocument()
  })

  it('shows an empty state', async () => {
    server.use(http.get('/api/runs', () => HttpResponse.json(page([], 1, 0))))
    renderRoute('/en')

    expect(await screen.findByText(/No runs yet/)).toBeInTheDocument()
  })

  it('shows cost and tokens for completed runs only', async () => {
    server.use(
      http.get('/api/runs', () =>
        HttpResponse.json(
          page(
            [run('r1', 'Revyan', 'COMPLETED'), run('r2', 'Draft brand')],
            1,
            1,
          ),
        ),
      ),
    )
    renderRoute('/en')

    expect(await screen.findByText('$0.76 · 115K tokens')).toBeInTheDocument()
    expect(screen.getAllByText(/tokens/)).toHaveLength(1)
  })

  it('searches once typing pauses, and says when nothing matches', async () => {
    const user = userEvent.setup()
    const searches: Array<string | null> = []
    server.use(
      http.get('/api/runs', ({ request }) => {
        const search = new URL(request.url).searchParams.get('search')
        searches.push(search)
        return HttpResponse.json(
          search === 'zzz' ? page([], 1, 0) : page([run('r1', 'Revyan')], 1, 1),
        )
      }),
    )
    renderRoute('/en')
    await screen.findByText('Revyan')

    await user.type(
      screen.getByRole('searchbox', { name: 'Search runs' }),
      'zzz',
    )

    expect(await screen.findByText('No runs match “zzz”.')).toBeInTheDocument()
    // The first load, then one search: not one request per keystroke.
    expect(searches).toEqual([null, 'zzz'])
  })

  it('keeps the search in the URL and starts from it', async () => {
    const user = userEvent.setup()
    const searches: Array<string | null> = []
    server.use(
      http.get('/api/runs', ({ request }) => {
        searches.push(new URL(request.url).searchParams.get('search'))
        return HttpResponse.json(page([run('r1', 'Revyan')], 1, 1))
      }),
    )
    const router = renderRoute('/en?search=rev')

    // Opened with ?search=: the field and the first request use it.
    expect(
      await screen.findByRole('searchbox', { name: 'Search runs' }),
    ).toHaveValue('rev')
    expect(searches[0]).toBe('rev')

    await user.type(
      screen.getByRole('searchbox', { name: 'Search runs' }),
      'yan',
    )
    await waitFor(() =>
      expect(router.state.location.search).toBe('?search=revyan'),
    )
  })
})

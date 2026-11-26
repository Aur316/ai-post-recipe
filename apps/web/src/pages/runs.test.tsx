import { DEFAULT_PAGE_SIZE } from '@ai-post-recipe/shared'
import { screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'

import { renderRoute } from '@/test/render'
import { server } from '@/test/server'

const run = (id: string, brandName: string) => ({
  id,
  brandName,
  instagram: 'https://www.instagram.com/gymbeamhr/',
  language: 'hr',
  status: 'DRAFT',
  createdAt: '2026-11-25T10:00:00.000Z',
  updatedAt: '2026-11-25T10:00:00.000Z',
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
})

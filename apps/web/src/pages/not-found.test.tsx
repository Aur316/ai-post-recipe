import { screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'

import { renderRoute } from '@/test/render'
import { server } from '@/test/server'

const UNKNOWN_ID = '01a213f4-0000-7000-8000-000000000000'

describe('Not found', () => {
  it('shows 404 for an unknown address, with the header and a way back', async () => {
    renderRoute('/en/no/such/page')

    expect(
      await screen.findByRole('heading', { name: 'Page not found' }),
    ).toBeInTheDocument()
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Back to the runs' }),
    ).toHaveAttribute('href', '/en')
    expect(screen.getByRole('button', { name: 'HR' })).toBeInTheDocument()
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex',
    )
  })

  it('adds the language to an unknown address first', async () => {
    const router = renderRoute('/no-such-page')

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/en/no-such-page'),
    )
    expect(
      await screen.findByRole('heading', { name: 'Page not found' }),
    ).toBeInTheDocument()
  })

  it('shows 404 in Croatian under /hr', async () => {
    renderRoute('/hr/nema')

    expect(
      await screen.findByRole('heading', { name: 'Stranica nije pronađena' }),
    ).toBeInTheDocument()
  })

  it('shows 404 for a run that does not exist', async () => {
    server.use(
      http.get(`/api/runs/${UNKNOWN_ID}`, () =>
        HttpResponse.json(
          { error: { code: 'RUN_NOT_FOUND', message: 'Run not found' } },
          { status: 404 },
        ),
      ),
    )
    renderRoute(`/en/runs/${UNKNOWN_ID}`)

    expect(
      await screen.findByRole('heading', { name: 'Run not found' }),
    ).toBeInTheDocument()
  })
})

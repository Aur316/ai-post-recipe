import { render, screen } from '@testing-library/react'

import { App } from '@/App'

describe('App', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('shows the API status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          Response.json({
            status: 'ok',
            checks: { database: true, storage: true },
          }),
        ),
      ),
    )
    render(<App />)
    expect(await screen.findByText('API: ok')).toBeInTheDocument()
  })

  it('shows when the API is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('down'))),
    )
    render(<App />)
    expect(await screen.findByText('API: unavailable')).toBeInTheDocument()
  })
})

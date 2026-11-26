import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'

import { renderRoute } from '@/test/render'
import { server } from '@/test/server'

const health = (llm: string, search: string) =>
  http.get('/api/health', () =>
    HttpResponse.json({
      status: 'ok',
      checks: { database: true, storage: true },
      providers: { llm, search },
    }),
  )

const emptyRuns = http.get('/api/runs', () =>
  HttpResponse.json({ items: [], total: 0, page: 1, size: 20, totalPages: 0 }),
)

describe('Onboarding', () => {
  it('opens from the demo-mode banner', async () => {
    const user = userEvent.setup()
    server.use(health('fake', 'none'), emptyRuns)
    const router = renderRoute('/en')

    const banner = await screen.findByRole('status')
    await user.click(
      within(banner).getByRole('link', { name: 'Set up the keys' }),
    )

    expect(router.state.location.pathname).toBe('/en/onboarding')
    expect(
      await screen.findByRole('heading', { name: 'Setup: API keys' }),
    ).toBeInTheDocument()
  })

  it('shows which keys are set and where to get them', async () => {
    server.use(health('fake', 'serper'))
    renderRoute('/en/onboarding')

    expect(await screen.findByText('Not set')).toBeInTheDocument()
    expect(screen.getByText('Set')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /openrouter\.ai\/keys/ }),
    ).toHaveAttribute('href', 'https://openrouter.ai/keys')
    expect(
      screen.getByText('OPENROUTER_API_KEY=sk-or-v1-...'),
    ).toBeInTheDocument()
    expect(screen.getByText('SERPER_API_KEY=...')).toBeInTheDocument()
  })

  it('has no banner once the OpenRouter key is set', async () => {
    renderRoute('/en/onboarding')

    expect(await screen.findAllByText('Set')).toHaveLength(2)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('is translated under /hr', async () => {
    renderRoute('/hr/onboarding')

    expect(
      await screen.findByRole('heading', {
        name: 'Postavljanje: API ključevi',
      }),
    ).toBeInTheDocument()
  })
})

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'

import { renderRoute } from '@/test/render'
import { server } from '@/test/server'

describe('Theme toggle', () => {
  beforeEach(() => {
    document.documentElement.classList.add('dark')
    localStorage.clear()
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
  })

  it('starts dark and switches to light and back, remembering the choice', async () => {
    const user = userEvent.setup()
    renderRoute('/en')

    await user.click(
      await screen.findByRole('button', { name: 'Switch to light theme' }),
    )
    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem('theme')).toBe('light')

    await user.click(
      screen.getByRole('button', { name: 'Switch to dark theme' }),
    )
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
  })
})

describe('Language toggle', () => {
  beforeEach(() => {
    localStorage.clear()
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
  })

  it('switches the interface to Croatian and back, remembering the choice', async () => {
    const user = userEvent.setup()
    renderRoute('/en')

    expect(
      await screen.findByRole('heading', { name: 'Runs' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'HR' }))

    expect(
      await screen.findByRole('heading', { name: 'Pokretanja' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'HR' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(document.documentElement.lang).toBe('hr')
    expect(localStorage.getItem('language')).toBe('hr')

    await user.click(screen.getByRole('button', { name: 'EN' }))
    expect(
      await screen.findByRole('heading', { name: 'Runs' }),
    ).toBeInTheDocument()
    expect(localStorage.getItem('language')).toBe('en')
  })

  it('shows form errors in Croatian', async () => {
    const user = userEvent.setup()
    renderRoute('/en/runs/new')

    await user.click(await screen.findByRole('button', { name: 'HR' }))
    await user.click(screen.getByRole('button', { name: 'Dalje' }))

    expect(
      await screen.findByText('Naziv brenda je obavezan'),
    ).toBeInTheDocument()
  })
})

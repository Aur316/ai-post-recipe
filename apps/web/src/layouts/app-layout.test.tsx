import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'

import { renderRoute } from '@/test/render'
import { server } from '@/test/server'

describe('Theme toggle', () => {
  beforeEach(() => {
    document.documentElement.classList.add('dark')
    localStorage.clear()
    server.use(http.get('/api/runs', () => HttpResponse.json([])))
  })

  it('starts dark and switches to light and back, remembering the choice', async () => {
    const user = userEvent.setup()
    renderRoute('/')

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

import { screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'

import { renderRoute } from '@/test/render'
import { server } from '@/test/server'

const run = {
  id: 'r1',
  brandName: 'GymBeam Hrvatska',
  instagram: 'https://www.instagram.com/gymbeamhr/',
  language: 'hr',
  status: 'DRAFT',
  createdAt: '2026-11-25T10:00:00.000Z',
  updatedAt: '2026-11-25T10:00:00.000Z',
}

describe('Runs page', () => {
  it('lists runs with their status and links to them', async () => {
    server.use(http.get('/api/runs', () => HttpResponse.json([run])))
    renderRoute('/')

    const link = await screen.findByRole('link', { name: /GymBeam Hrvatska/ })
    expect(link).toHaveAttribute('href', '/runs/r1')
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('shows an empty state', async () => {
    server.use(http.get('/api/runs', () => HttpResponse.json([])))
    renderRoute('/')

    expect(await screen.findByText(/No runs yet/)).toBeInTheDocument()
  })
})

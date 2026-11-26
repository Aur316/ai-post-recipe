import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'

import { renderRoute } from '@/test/render'
import { server } from '@/test/server'

const RUN_ID = '01a213f4-9d21-76ed-b4d4-2c2eb457302d'

const analysis = {
  tone: 'Energetic',
  audience: 'Adults',
  themes: ['Tips'],
  colors: ['#FF6600'],
  claims: [],
}

const phaseRun = (phase: string, status: string, output: unknown = null) => ({
  id: crypto.randomUUID(),
  phase,
  attempt: 1,
  status,
  output,
  editedOutput: null,
  promptId: null,
  model: null,
  tokensIn: null,
  tokensOut: null,
  costUsd: null,
  error: null,
  startedAt: null,
  finishedAt: null,
})

const run = (status: string, phases: Array<ReturnType<typeof phaseRun>>) => ({
  id: RUN_ID,
  brandName: 'GymBeam Hrvatska',
  instagram: 'https://www.instagram.com/gymbeamhr/',
  language: 'hr',
  status,
  createdAt: '2026-11-25T10:00:00.000Z',
  updatedAt: '2026-11-25T10:00:00.000Z',
  brief: {
    brandName: 'GymBeam Hrvatska',
    instagramUrl: 'https://www.instagram.com/gymbeamhr/',
    reason: 'Reason for the brand',
    links: [{ type: 'SHOP', url: 'https://gymbeam.hr' }],
    products: [{ name: 'True Whey' }],
    audience: 'Adults',
    goals: 'Saves',
    inspiration: '',
    inspirationLinks: [],
    language: 'hr',
    formats: [],
  },
  assets: [],
  phases,
})

describe('Run details', () => {
  it('starts a draft run', async () => {
    const user = userEvent.setup()
    let started = false
    server.use(
      http.get(`/api/runs/${RUN_ID}`, () =>
        HttpResponse.json(run('DRAFT', [])),
      ),
      http.post(`/api/runs/${RUN_ID}/start`, () => {
        started = true
        return new HttpResponse(null, { status: 202 })
      }),
    )
    renderRoute(`/runs/${RUN_ID}`)

    expect(await screen.findAllByText('Not started')).toHaveLength(8)
    await user.click(screen.getByRole('button', { name: 'Start' }))
    await waitFor(() => expect(started).toBe(true))
  })

  describe('approval', () => {
    let body: unknown
    beforeEach(() => {
      body = undefined
      server.use(
        http.get(`/api/runs/${RUN_ID}`, () =>
          HttpResponse.json(
            run('AWAITING_APPROVAL', [
              phaseRun('BRIEF', 'DONE', { accepted: true }),
              phaseRun('RESEARCH', 'DONE', { sources: [] }),
              phaseRun('ANALYSIS', 'AWAITING_APPROVAL', analysis),
            ]),
          ),
        ),
        http.post(
          `/api/runs/${RUN_ID}/phases/ANALYSIS/approve`,
          async ({ request }) => {
            body = await request.json()
            return new HttpResponse(null, { status: 202 })
          },
        ),
      )
    })

    it('approves the proposal unchanged', async () => {
      const user = userEvent.setup()
      renderRoute(`/runs/${RUN_ID}`)

      await user.click(await screen.findByRole('button', { name: 'Approve' }))
      await waitFor(() => expect(body).toEqual({}))
    })

    it('sends the edited version', async () => {
      const user = userEvent.setup()
      renderRoute(`/runs/${RUN_ID}`)

      const editor = await screen.findByLabelText('Phase output')
      fireEvent.change(editor, {
        target: { value: JSON.stringify({ ...analysis, tone: 'Calm' }) },
      })
      await user.click(
        screen.getByRole('button', { name: 'Approve with edits' }),
      )
      await waitFor(() =>
        expect(body).toEqual({ editedOutput: { ...analysis, tone: 'Calm' } }),
      )
    })

    it('does not send invalid JSON', async () => {
      const user = userEvent.setup()
      renderRoute(`/runs/${RUN_ID}`)

      const editor = await screen.findByLabelText('Phase output')
      fireEvent.change(editor, { target: { value: '{ nope' } })
      await user.click(
        screen.getByRole('button', { name: 'Approve with edits' }),
      )

      expect(screen.getByText('Not valid JSON')).toBeInTheDocument()
      expect(body).toBeUndefined()
    })
  })
})

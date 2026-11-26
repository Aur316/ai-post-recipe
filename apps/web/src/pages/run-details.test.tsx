import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'

import { renderRoute } from '@/test/render'
import { server } from '@/test/server'

const RUN_ID = '01a213f4-9d21-76ed-b4d4-2c2eb457302d'

const analysis = {
  summary: 'A sports nutrition shop',
  tone: 'Energetic',
  audience: 'Adults',
  themes: ['Tips'],
  visualStyle: 'Bold',
  colors: [{ hex: '#FF6600', name: 'Orange', usage: 'Accents' }],
  productPresentation: 'Packshots',
  peoplePresentation: 'Athletes',
  claims: [
    {
      text: 'Ships across Croatia',
      status: 'verified',
      sourceUrl: 'https://gymbeam.hr',
      evidence: 'Dostava u cijeloj Hrvatskoj',
    },
    {
      text: 'Mostly young buyers',
      status: 'assumption',
      sourceUrl: null,
      evidence: null,
    },
  ],
  gaps: ['No price list'],
}

const phaseRun = (phase: string, status: string, output: unknown = null) => ({
  id: crypto.randomUUID(),
  phase,
  attempt: 1,
  status,
  output,
  editedOutput: null as unknown,
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
  sources: [] as Array<unknown>,
  posts: [] as Array<unknown>,
  usage: { costUsd: 0, tokensIn: 0, tokensOut: 0 },
  usageByPhase: [] as Array<unknown>,
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
    renderRoute(`/en/runs/${RUN_ID}`)

    expect(await screen.findAllByText('Not started')).toHaveLength(8)
    await user.click(screen.getByRole('button', { name: 'Start' }))
    await waitFor(() => expect(started).toBe(true))
  })

  it('offers to edit the brief only before the run starts', async () => {
    server.use(
      http.get(`/api/runs/${RUN_ID}`, () =>
        HttpResponse.json(run('DRAFT', [])),
      ),
    )
    renderRoute(`/en/runs/${RUN_ID}`)

    expect(
      await screen.findByRole('link', { name: 'Edit brief' }),
    ).toHaveAttribute('href', `/en/runs/${RUN_ID}/edit`)
  })

  it('hides the edit link once a phase has run', async () => {
    server.use(
      http.get(`/api/runs/${RUN_ID}`, () =>
        HttpResponse.json(run('FAILED', [phaseRun('BRIEF', 'FAILED')])),
      ),
    )
    renderRoute(`/en/runs/${RUN_ID}`)

    await screen.findByRole('button', { name: 'Continue' })
    expect(screen.queryByRole('link', { name: 'Edit brief' })).toBeNull()
  })

  it('links back to the runs list', async () => {
    server.use(
      http.get(`/api/runs/${RUN_ID}`, () =>
        HttpResponse.json(run('DRAFT', [])),
      ),
    )
    renderRoute(`/en/runs/${RUN_ID}`)

    expect(await screen.findByRole('link', { name: 'Runs' })).toHaveAttribute(
      'href',
      '/en',
    )
  })

  it('links the brief editor back to its run', async () => {
    server.use(
      http.get(`/api/runs/${RUN_ID}`, () =>
        HttpResponse.json(run('DRAFT', [])),
      ),
    )
    renderRoute(`/en/runs/${RUN_ID}/edit`)

    expect(
      await screen.findByRole('link', { name: 'GymBeam Hrvatska' }),
    ).toHaveAttribute('href', `/en/runs/${RUN_ID}`)
  })

  it('lists the sources, including those that could not be read', async () => {
    server.use(
      http.get(`/api/runs/${RUN_ID}`, () =>
        HttpResponse.json({
          ...run('RUNNING', [phaseRun('RESEARCH', 'DONE')]),
          sources: [
            {
              id: crypto.randomUUID(),
              url: 'https://gymbeam.hr',
              title: 'GymBeam',
              excerpt: 'Sports nutrition',
              reachable: true,
              error: null,
              origin: 'BRIEF',
              fetchedAt: '2026-11-26T10:00:00.000Z',
            },
            {
              id: crypto.randomUUID(),
              url: 'https://gymbeam.hr/gone',
              title: null,
              excerpt: null,
              reachable: false,
              error: 'HTTP 404',
              origin: 'SEARCH',
              fetchedAt: '2026-11-26T10:00:00.000Z',
            },
          ],
        }),
      ),
    )
    renderRoute(`/en/runs/${RUN_ID}`)

    expect(await screen.findByText('Sources (2)')).toBeInTheDocument()
    expect(screen.getByText('1 read, 1 could not be read')).toBeInTheDocument()
    expect(screen.getByText('HTTP 404')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'GymBeam' })).toHaveAttribute(
      'href',
      'https://gymbeam.hr',
    )
  })

  it('shows the analysis with claim labels and sources', async () => {
    server.use(
      http.get(`/api/runs/${RUN_ID}`, () =>
        HttpResponse.json(
          run('RUNNING', [phaseRun('ANALYSIS', 'APPROVED', analysis)]),
        ),
      ),
    )
    renderRoute(`/en/runs/${RUN_ID}`)

    expect(await screen.findByText('Ships across Croatia')).toBeInTheDocument()
    expect(screen.getByText('Verified')).toBeInTheDocument()
    expect(screen.getByText('Assumption')).toBeInTheDocument()
    expect(screen.getByText('#FF6600')).toBeInTheDocument()
    expect(screen.getByText('No price list')).toBeInTheDocument()
  })

  it('warns in demo mode', async () => {
    server.use(
      http.get('/api/health', () =>
        HttpResponse.json({
          status: 'ok',
          checks: { database: true, storage: true },
          providers: { llm: 'fake', search: 'none' },
        }),
      ),
      http.get(`/api/runs/${RUN_ID}`, () =>
        HttpResponse.json(run('DRAFT', [])),
      ),
    )
    renderRoute(`/en/runs/${RUN_ID}`)

    expect(await screen.findByRole('status')).toHaveTextContent('Demo mode')
  })

  it('summarises the brief and the research', async () => {
    const research = {
      queries: ['GymBeam Hrvatska'],
      sources: [
        {
          url: 'https://gymbeam.hr',
          title: 'GymBeam shop',
          excerpt: '',
          text: '',
          reachable: true,
          error: null,
          origin: 'BRIEF',
          fetchedAt: '2026-11-26T10:00:00.000Z',
        },
        {
          url: 'https://blocked.example',
          title: 'Blocked page',
          excerpt: '',
          text: '',
          reachable: false,
          error: 'Blocked by robots.txt',
          origin: 'SEARCH',
          fetchedAt: '2026-11-26T10:00:00.000Z',
        },
      ],
    }
    server.use(
      http.get(`/api/runs/${RUN_ID}`, () =>
        HttpResponse.json(
          run('RUNNING', [
            phaseRun('BRIEF', 'DONE', { accepted: true }),
            phaseRun('RESEARCH', 'DONE', research),
          ]),
        ),
      ),
    )
    renderRoute(`/en/runs/${RUN_ID}`)

    expect(
      await screen.findByText('Brief for GymBeam Hrvatska accepted'),
    ).toBeInTheDocument()
    expect(screen.getByText('Pages read')).toBeInTheDocument()
    expect(
      screen.getByText('GymBeam Hrvatska', { selector: '[data-slot="badge"]' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Blocked page' }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByText(/Blocked by robots\.txt/).length,
    ).toBeGreaterThan(0)
  })

  describe('post preview', () => {
    const postDto = {
      id: crypto.randomUUID(),
      index: 2,
      format: 'CAROUSEL',
      goal: 'Saves',
      concept: 'c',
      rationale: 'r',
      product: 'Kreatin',
      caption: 'Kreatin bez mitova',
      hashtags: ['#kreatin'],
      slides: [
        { order: 1, text: 'Prvi slajd', assetId: 'a1' },
        { order: 2, text: 'Drugi slajd', assetId: 'a2' },
      ],
    }

    beforeEach(() => {
      server.use(
        http.get(`/api/runs/${RUN_ID}`, () =>
          HttpResponse.json({
            ...run('COMPLETED', [phaseRun('VISUALS', 'DONE', { slides: [] })]),
            posts: [postDto],
          }),
        ),
      )
    })

    it('swipes through the rendered slides', async () => {
      const user = userEvent.setup()
      renderRoute(`/en/runs/${RUN_ID}`)

      expect(
        await screen.findByRole('img', { name: 'Prvi slajd' }),
      ).toHaveAttribute('src', '/api/assets/a1')
      await user.click(screen.getByRole('button', { name: 'Next slide' }))
      expect(
        screen.getByRole('img', { name: 'Drugi slajd' }),
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Next slide' })).toBeDisabled()
    })

    it('edits the caption', async () => {
      const user = userEvent.setup()
      let sent: unknown
      server.use(
        http.patch(`/api/runs/${RUN_ID}/posts/2`, async ({ request }) => {
          sent = await request.json()
          return HttpResponse.json({ ...postDto, caption: 'Nova' })
        }),
      )
      renderRoute(`/en/runs/${RUN_ID}`)

      await user.click(
        await screen.findByRole('button', { name: 'Edit caption' }),
      )
      const caption = screen.getByLabelText('Caption')
      await user.clear(caption)
      await user.type(caption, 'Nova')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() =>
        expect(sent).toEqual({ caption: 'Nova', hashtags: ['#kreatin'] }),
      )
    })

    it('regenerates the current slide with an instruction', async () => {
      const user = userEvent.setup()
      let sent: unknown
      server.use(
        http.post(
          `/api/runs/${RUN_ID}/posts/2/slides/1/regenerate`,
          async ({ request }) => {
            sent = await request.json()
            return HttpResponse.json(postDto)
          },
        ),
      )
      renderRoute(`/en/runs/${RUN_ID}`)

      await user.click(
        await screen.findByRole('button', { name: 'Regenerate slide 1' }),
      )
      await user.type(
        screen.getByLabelText('Instruction for the new slide'),
        'darker',
      )
      await user.click(screen.getByRole('button', { name: 'Regenerate' }))

      await waitFor(() => expect(sent).toEqual({ instruction: 'darker' }))
    })
  })

  describe('plan and copy', () => {
    const plan = {
      posts: [1, 2, 3].map((index) => ({
        index,
        format: index === 2 ? 'CAROUSEL' : 'IMAGE',
        goal: `Goal ${index}`,
        concept: `Concept ${index}`,
        rationale: `Rationale ${index}`,
        product: 'True Whey',
      })),
    }
    const copy = {
      posts: [1, 2, 3].map((index) => ({
        index,
        caption: `Caption ${index}`,
        hashtags: ['#gymbeam'],
        slides: [{ order: 1, text: `Slide ${index}` }],
      })),
      unsupported: [
        {
          postIndex: 2,
          place: 1,
          kind: 'number',
          value: '40',
          context: 'Sada 40% popusta',
        },
      ],
    }

    it('shows the plan as cards while it waits for approval', async () => {
      server.use(
        http.get(`/api/runs/${RUN_ID}`, () =>
          HttpResponse.json(
            run('AWAITING_APPROVAL', [
              phaseRun('PLAN', 'AWAITING_APPROVAL', plan),
            ]),
          ),
        ),
      )
      renderRoute(`/en/runs/${RUN_ID}`)

      expect(await screen.findByText('Concept 2')).toBeInTheDocument()
      expect(screen.getByText('Carousel')).toBeInTheDocument()
      expect(screen.getByText('Post 3')).toBeInTheDocument()
    })

    it('shows the copy and the facts that need checking', async () => {
      server.use(
        http.get(`/api/runs/${RUN_ID}`, () =>
          HttpResponse.json(run('RUNNING', [phaseRun('COPY', 'DONE', copy)])),
        ),
      )
      renderRoute(`/en/runs/${RUN_ID}`)

      expect(await screen.findByText('Caption 2')).toBeInTheDocument()
      expect(screen.getByRole('note')).toHaveTextContent(
        'Check before publishing: 1 number(s) or quote(s) appear in no source',
      )
      expect(screen.getByRole('note')).toHaveTextContent('Post 2, slide 1: 40')
    })

    it('lists the edits and shows the AI proposal on request', async () => {
      const user = userEvent.setup()
      const edited = {
        posts: plan.posts.map((p) =>
          p.index === 1 ? { ...p, concept: 'My concept' } : p,
        ),
      }
      server.use(
        http.get(`/api/runs/${RUN_ID}`, () =>
          HttpResponse.json(
            run('RUNNING', [
              { ...phaseRun('PLAN', 'APPROVED', plan), editedOutput: edited },
            ]),
          ),
        ),
      )
      renderRoute(`/en/runs/${RUN_ID}`)

      expect(
        await screen.findByText('Your edits at approval (1)'),
      ).toBeInTheDocument()
      expect(screen.getByText('posts.0.concept')).toBeInTheDocument()
      expect(screen.getAllByText('My concept').length).toBeGreaterThan(0)

      await user.click(screen.getByRole('button', { name: 'AI proposal' }))
      expect(screen.getAllByText('Concept 1').length).toBeGreaterThan(0)
    })
  })

  it('deletes the run after confirmation and goes back to the list', async () => {
    const user = userEvent.setup()
    let deleted = false
    server.use(
      http.get(`/api/runs/${RUN_ID}`, () =>
        HttpResponse.json(run('COMPLETED', [])),
      ),
      http.delete(`/api/runs/${RUN_ID}`, () => {
        deleted = true
        return new HttpResponse(null, { status: 204 })
      }),
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
    const router = renderRoute(`/en/runs/${RUN_ID}`)

    await user.click(await screen.findByRole('button', { name: 'Delete run' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent('Delete the run for GymBeam Hrvatska?')
    expect(deleted).toBe(false)
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(deleted).toBe(true))
    await waitFor(() => expect(router.state.location.pathname).toBe('/en'))
  })

  it('cannot delete a run while a phase runs', async () => {
    server.use(
      http.get(`/api/runs/${RUN_ID}`, () =>
        HttpResponse.json(run('RUNNING', [phaseRun('BRIEF', 'RUNNING')])),
      ),
    )
    renderRoute(`/en/runs/${RUN_ID}`)

    expect(
      await screen.findByRole('button', { name: 'Delete run' }),
    ).toBeDisabled()
  })

  it('shows the review and offers the ZIP', async () => {
    const review = {
      score: 0.5,
      issues: ['Post 1, caption: "40" appears in no source'],
      replaced: [],
      slides: [
        {
          postIndex: 1,
          order: 1,
          passed: true,
          issues: [],
          ruleIssues: [],
          regenerated: true,
        },
        {
          postIndex: 1,
          order: 2,
          passed: false,
          issues: ['Text overlaps the shelf'],
          ruleIssues: [],
          regenerated: false,
        },
      ],
    }
    server.use(
      http.get(`/api/runs/${RUN_ID}`, () =>
        HttpResponse.json({
          ...run('COMPLETED', [
            phaseRun('REVIEW', 'DONE', review),
            phaseRun('EXPORT', 'DONE', { assetId: 'zip', files: 12 }),
          ]),
          posts: [
            {
              id: crypto.randomUUID(),
              index: 1,
              format: 'IMAGE',
              goal: 'g',
              concept: 'c',
              rationale: 'r',
              product: 'p',
              caption: 'Caption',
              hashtags: [],
              slides: [],
            },
          ],
        }),
      ),
    )
    renderRoute(`/en/runs/${RUN_ID}`)

    expect(await screen.findByText('50%')).toBeInTheDocument()
    expect(screen.getByText('Text overlaps the shelf')).toBeInTheDocument()
    expect(screen.getByText('made again')).toBeInTheDocument()
    expect(screen.getAllByText(/appears in no source/).length).toBeGreaterThan(
      0,
    )
    const links = screen.getAllByRole('link', { name: 'Download ZIP' })
    expect(links[0]).toHaveAttribute('href', `/api/runs/${RUN_ID}/export`)
  })

  it('shows the cost and tokens, with a breakdown per phase', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(`/api/runs/${RUN_ID}`, () =>
        HttpResponse.json({
          ...run('COMPLETED', [phaseRun('ANALYSIS', 'APPROVED', analysis)]),
          usage: { costUsd: 0.7593, tokensIn: 98_000, tokensOut: 17_000 },
          usageByPhase: [
            {
              phase: 'ANALYSIS',
              attempts: 1,
              costUsd: 0.06,
              tokensIn: 27_000,
              tokensOut: 4_000,
            },
            {
              phase: 'REVIEW',
              attempts: 2,
              costUsd: 0.45,
              tokensIn: 50_000,
              tokensOut: 2_000,
            },
          ],
        }),
      ),
    )
    renderRoute(`/en/runs/${RUN_ID}`)

    const button = await screen.findByRole('button', {
      name: 'Cost and tokens per phase',
    })
    expect(button).toHaveTextContent('$0.76 · 115K tokens')
    await user.click(button)
    const table = await screen.findByRole('table')
    expect(within(table).getByText('Brand analysis')).toBeInTheDocument()
    expect(within(table).getByText('$0.45')).toBeInTheDocument()
    expect(within(table).getByText('Total')).toBeInTheDocument()
  })

  describe('references', () => {
    const logo = {
      id: '01a213f4-9d21-76ed-b4d4-2c2eb4573099',
      runId: RUN_ID,
      kind: 'UPLOAD_LOGO',
      mimeType: 'image/png',
      width: 8,
      height: 8,
      sizeBytes: 100,
      createdAt: '2026-11-25T10:00:00.000Z',
    }

    it('removes an upload before the run starts', async () => {
      const user = userEvent.setup()
      let deleted = false
      server.use(
        http.get(`/api/runs/${RUN_ID}`, () =>
          HttpResponse.json({ ...run('DRAFT', []), assets: [logo] }),
        ),
        http.delete(`/api/assets/${logo.id}`, () => {
          deleted = true
          return new HttpResponse(null, { status: 204 })
        }),
      )
      renderRoute(`/en/runs/${RUN_ID}`)

      await user.click(
        await screen.findByRole('button', { name: 'Remove logo' }),
      )
      const dialog = await screen.findByRole('alertdialog')
      expect(deleted).toBe(false)
      await user.click(within(dialog).getByRole('button', { name: 'Remove' }))
      await waitFor(() => expect(deleted).toBe(true))
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    })

    it('keeps the upload when the removal is cancelled', async () => {
      const user = userEvent.setup()
      let deleted = false
      server.use(
        http.get(`/api/runs/${RUN_ID}`, () =>
          HttpResponse.json({ ...run('DRAFT', []), assets: [logo] }),
        ),
        http.delete(`/api/assets/${logo.id}`, () => {
          deleted = true
          return new HttpResponse(null, { status: 204 })
        }),
      )
      renderRoute(`/en/runs/${RUN_ID}`)

      await user.click(
        await screen.findByRole('button', { name: 'Remove logo' }),
      )
      await user.click(
        within(await screen.findByRole('alertdialog')).getByRole('button', {
          name: 'Cancel',
        }),
      )

      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
      expect(deleted).toBe(false)
    })

    it('keeps uploads once the run has started', async () => {
      server.use(
        http.get(`/api/runs/${RUN_ID}`, () =>
          HttpResponse.json({
            ...run('RUNNING', [phaseRun('BRIEF', 'RUNNING')]),
            assets: [logo],
          }),
        ),
      )
      renderRoute(`/en/runs/${RUN_ID}`)

      expect(await screen.findByRole('img', { name: 'Logo' })).toBeVisible()
      expect(screen.queryByRole('button', { name: 'Remove logo' })).toBeNull()
    })
  })

  describe('editing the brief', () => {
    it('saves the edited brief and opens the run', async () => {
      const user = userEvent.setup()
      let sent: { brandName?: string } | undefined
      server.use(
        http.get(`/api/runs/${RUN_ID}`, () =>
          HttpResponse.json(run('DRAFT', [])),
        ),
        http.put(`/api/runs/${RUN_ID}`, async ({ request }) => {
          sent = (await request.json()) as typeof sent
          return HttpResponse.json(run('DRAFT', []))
        }),
      )
      const router = renderRoute(`/en/runs/${RUN_ID}/edit`)

      const name = await screen.findByLabelText('Brand name')
      expect(name).toHaveValue('GymBeam Hrvatska')
      await user.clear(name)
      await user.type(name, 'GymBeam HR')
      for (let i = 0; i < 3; i++) {
        await user.click(screen.getByRole('button', { name: 'Next' }))
      }
      await user.click(
        await screen.findByRole('button', { name: 'Save changes' }),
      )

      await waitFor(() => expect(sent?.brandName).toBe('GymBeam HR'))
      await waitFor(() =>
        expect(router.state.location.pathname).toBe(`/en/runs/${RUN_ID}`),
      )
    })

    it('does not show the form for a started run', async () => {
      server.use(
        http.get(`/api/runs/${RUN_ID}`, () =>
          HttpResponse.json(run('RUNNING', [phaseRun('BRIEF', 'RUNNING')])),
        ),
      )
      renderRoute(`/en/runs/${RUN_ID}/edit`)

      expect(await screen.findByText(/already started/)).toBeInTheDocument()
      expect(screen.queryByLabelText('Brand name')).toBeNull()
    })
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
      renderRoute(`/en/runs/${RUN_ID}`)

      await user.click(await screen.findByRole('button', { name: 'Approve' }))
      await waitFor(() => expect(body).toEqual({}))
    })

    it('sends the edited version', async () => {
      const user = userEvent.setup()
      renderRoute(`/en/runs/${RUN_ID}`)

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
      renderRoute(`/en/runs/${RUN_ID}`)

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

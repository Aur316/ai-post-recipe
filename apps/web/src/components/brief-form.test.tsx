import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'

import { renderRoute } from '@/test/render'
import { server } from '@/test/server'

const createdRun = {
  id: 'r1',
  brandName: 'GymBeam Hrvatska',
  instagram: 'https://www.instagram.com/gymbeamhr/',
  language: 'hr',
  status: 'DRAFT',
  createdAt: '2026-11-25T10:00:00.000Z',
  updatedAt: '2026-11-25T10:00:00.000Z',
}

describe('Brief form', () => {
  it('stays on the first step until its fields are valid', async () => {
    const user = userEvent.setup()
    renderRoute('/runs/new')

    await user.type(
      screen.getByLabelText('Instagram profile URL'),
      'https://facebook.com/x',
    )
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(
      await screen.findByText('Brand name is required'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Use the brand’s instagram.com profile URL'),
    ).toBeInTheDocument()
    expect(screen.getByText('Brand', { selector: '[data-slot="card-title"]' }))
  })

  it('creates the run, uploads the files and opens the run', async () => {
    const user = userEvent.setup()
    let sentBrief: unknown
    const uploadedKinds: Array<string | undefined> = []
    server.use(
      http.post('/api/runs', async ({ request }) => {
        sentBrief = await request.json()
        return HttpResponse.json(createdRun, { status: 201 })
      }),
      http.post('/api/runs/r1/assets', async ({ request }) => {
        // Read the multipart body as text: jsdom's File trips Node's form-data parser.
        const body = await request.text()
        uploadedKinds.push(/name="kind"\r\n\r\n(\w+)/.exec(body)?.[1])
        return HttpResponse.json({}, { status: 201 })
      }),
      http.get('/api/runs/r1', () =>
        HttpResponse.json({ ...createdRun, brief: {}, assets: [] }),
      ),
      http.get('/api/runs', () => HttpResponse.json([])),
    )
    const router = renderRoute('/runs/new')

    await user.type(screen.getByLabelText('Brand name'), 'GymBeam Hrvatska')
    await user.type(
      screen.getByLabelText('Instagram profile URL'),
      'https://www.instagram.com/gymbeamhr/',
    )
    await user.type(
      screen.getByLabelText('Why this brand?'),
      'Large product range and an active profile.',
    )
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await user.type(screen.getByLabelText('Link 1 URL'), 'https://gymbeam.hr')
    await user.type(screen.getByLabelText('Product 1 name'), 'True Whey')
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await user.type(screen.getByLabelText('Target audience'), 'Adults 18–35')
    await user.type(screen.getByLabelText('Goals'), 'More saves')
    await user.click(screen.getByRole('button', { name: 'Next' }))

    // Next on the third step must open the last step, not submit the form.
    expect(
      await screen.findByText('Output and references', {
        selector: '[data-slot="card-title"]',
      }),
    ).toBeInTheDocument()
    expect(sentBrief).toBeUndefined()

    await user.upload(
      screen.getByTestId('file-input'),
      new File(['png'], 'logo.png', { type: 'image/png' }),
    )
    await user.click(screen.getByRole('button', { name: 'Create run' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/runs/r1'))
    expect(sentBrief).toMatchObject({
      brandName: 'GymBeam Hrvatska',
      links: [{ type: 'WEBSITE', url: 'https://gymbeam.hr' }],
      products: [{ name: 'True Whey' }],
      inspirationLinks: [],
      language: 'hr',
    })
    expect(uploadedKinds).toEqual(['UPLOAD_LOGO'])
  })
})

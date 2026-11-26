import { useState } from 'react'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'

import { ErrorBoundary } from '@/components/error-boundary'
import { ErrorFallback } from '@/components/error-fallback'
import { RouteError } from '@/components/route-error'

import { AppLayout } from '@/layouts/app-layout'

let shouldThrow = true
function Boom() {
  if (shouldThrow) throw new Error('Kaboom')
  return <p>Recovered</p>
}

describe('Error boundary', () => {
  beforeEach(() => {
    shouldThrow = true
    // React logs caught render errors; keep the test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })
  afterEach(() => vi.restoreAllMocks())

  it('shows the fallback and renders again on "Try again"', async () => {
    const user = userEvent.setup()
    render(
      <ErrorBoundary fallback={(props) => <ErrorFallback {...props} />}>
        <Boom />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    expect(screen.getByText('Kaboom')).toBeInTheDocument()

    shouldThrow = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.getByText('Recovered')).toBeInTheDocument()
  })

  it('clears the error when the reset key changes', async () => {
    const user = userEvent.setup()
    function Page() {
      const [page, setPage] = useState('a')
      return (
        <>
          <button type="button" onClick={() => setPage('b')}>
            Other page
          </button>
          <ErrorBoundary
            resetKey={page}
            fallback={(props) => <ErrorFallback {...props} />}
          >
            {page === 'a' ? <Boom /> : <p>Page b</p>}
          </ErrorBoundary>
        </>
      )
    }
    render(<Page />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Other page' }))
    expect(screen.getByText('Page b')).toBeInTheDocument()
  })

  it('catches errors of the layout through the router', () => {
    const router = createMemoryRouter(
      [{ path: '/', element: <Boom />, errorElement: <RouteError /> }],
      { initialEntries: ['/'] },
    )
    render(<RouterProvider router={router} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    expect(
      screen.getByRole('link', { name: 'Back to the runs' }),
    ).toHaveAttribute('href', '/')
  })

  it('keeps the header when a page fails', () => {
    const router = createMemoryRouter(
      [
        {
          path: '/:lang',
          errorElement: <RouteError />,
          children: [
            {
              element: <AppLayout />,
              children: [{ index: true, element: <Boom /> }],
            },
          ],
        },
      ],
      { initialEntries: ['/en'] },
    )
    render(<RouterProvider router={router} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    expect(screen.getByRole('button', { name: 'HR' })).toBeInTheDocument()
  })
})

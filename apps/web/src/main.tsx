import { StrictMode } from 'react'

import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'

import { ErrorBoundary } from '@/components/error-boundary'
import { ErrorFallback } from '@/components/error-fallback'

import { ReactQueryProvider } from '@/contexts/query-client'
import '@/i18n'
import '@/index.css'
import { router } from '@/router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Last resort, for errors outside the router (providers, the router itself). */}
    <ErrorBoundary
      fallback={({ error }) => <ErrorFallback error={error} fullScreen />}
    >
      <ReactQueryProvider>
        <RouterProvider router={router} />
      </ReactQueryProvider>
    </ErrorBoundary>
  </StrictMode>,
)

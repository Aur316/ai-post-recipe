import { useRouteError } from 'react-router'

import { ErrorFallback } from '@/components/error-fallback'

/** The router's error element: errors in the layout or its loaders end here. */
export function RouteError() {
  return <ErrorFallback error={useRouteError()} fullScreen />
}

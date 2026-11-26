import { useRouteError } from 'react-router'

import { ErrorFallback } from '@/components/error-fallback'

export function RouteError() {
  return <ErrorFallback error={useRouteError()} fullScreen />
}

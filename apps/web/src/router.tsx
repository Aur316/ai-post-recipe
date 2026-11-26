import { type RouteObject, createBrowserRouter } from 'react-router'

import { LanguageRoute } from '@/i18n/language-route'
import { AppLayout } from '@/layouts/app-layout'
import { AddRun } from '@/pages/add-run'
import { EditRun } from '@/pages/edit-run'
import { RunDetails } from '@/pages/run-details'
import { Runs } from '@/pages/runs'

export const routes: Array<RouteObject> = [
  // `/` has no language yet; LanguageRoute redirects it.
  { index: true, element: <LanguageRoute /> },
  {
    path: ':lang',
    element: <LanguageRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Runs /> },
          { path: 'runs/new', element: <AddRun /> },
          { path: 'runs/:id', element: <RunDetails /> },
          { path: 'runs/:id/edit', element: <EditRun /> },
        ],
      },
    ],
  },
  // An old link without a language, e.g. /runs/1.
  { path: '*', element: <LanguageRoute /> },
]

export const router = createBrowserRouter(routes)

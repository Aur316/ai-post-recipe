import { type RouteObject, createBrowserRouter } from 'react-router'

import { RouteError } from '@/components/route-error'

import { LanguageRoute } from '@/i18n/language-route'
import { AppLayout } from '@/layouts/app-layout'
import { AddRun } from '@/pages/add-run'
import { EditRun } from '@/pages/edit-run'
import { NotFound } from '@/pages/not-found'
import { RunDetails } from '@/pages/run-details'
import { Runs } from '@/pages/runs'

export const routes: Array<RouteObject> = [
  // `/` has no language yet; LanguageRoute redirects it.
  { index: true, element: <LanguageRoute />, errorElement: <RouteError /> },
  {
    path: ':lang',
    element: <LanguageRoute />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Runs /> },
          { path: 'runs/new', element: <AddRun /> },
          { path: 'runs/:id', element: <RunDetails /> },
          { path: 'runs/:id/edit', element: <EditRun /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
  // An old link without a language, e.g. /runs/1.
  { path: '*', element: <LanguageRoute />, errorElement: <RouteError /> },
]

export const router = createBrowserRouter(routes)

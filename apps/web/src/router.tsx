import { type RouteObject, createBrowserRouter } from 'react-router'

import { AppLayout } from '@/layouts/app-layout'
import { AddRun } from '@/pages/add-run'
import { RunDetails } from '@/pages/run-details'
import { Runs } from '@/pages/runs'

export const routes: Array<RouteObject> = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Runs /> },
      { path: 'runs/new', element: <AddRun /> },
      { path: 'runs/:id', element: <RunDetails /> },
    ],
  },
]

export const router = createBrowserRouter(routes)

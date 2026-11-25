import { useEffect, useState } from 'react'

import { HealthResponse } from '@ai-post-recipe/shared'

export const App = () => {
  const [api, setApi] = useState('...')

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((body) => setApi(HealthResponse.parse(body).status))
      .catch(() => setApi('unavailable'))
  }, [])

  return (
    <main className="h-screen bg-muted-foreground p-8">
      <h1 className="text-2xl font-semibold">AI Post Recipe</h1>
      <p className="text-red-500">API: {api}</p>
    </main>
  )
}

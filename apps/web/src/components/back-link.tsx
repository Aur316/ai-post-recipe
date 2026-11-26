import { ArrowLeftIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'

import { useLocalizedPath } from '@/hooks/useLocalizedPath'

interface BackLinkProps {
  /** The parent page, without the language; not the browser history, so a shared link works too. */
  to: string
  label: string
}

export function BackLink({ to, label }: BackLinkProps) {
  const localized = useLocalizedPath()
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2.5">
      <Link to={localized(to)}>
        <ArrowLeftIcon data-icon="inline-start" />
        {label}
      </Link>
    </Button>
  )
}

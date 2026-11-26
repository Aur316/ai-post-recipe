import { ArrowLeftIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'

import { useLocalizedPath } from '@/hooks/useLocalizedPath'

interface BackLinkProps {
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

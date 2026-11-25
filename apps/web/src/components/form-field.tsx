import type { PropsWithChildren } from 'react'

import { Label } from '@/components/ui/label'

interface FormFieldProps {
  label: string
  htmlFor?: string
  error?: string
}

export function FormField({
  label,
  htmlFor,
  error,
  children,
}: PropsWithChildren<FormFieldProps>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

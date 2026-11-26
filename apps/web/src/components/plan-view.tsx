import type { PhaseOutputs } from '@ai-post-recipe/shared'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'

export function PlanView({ plan }: { plan: PhaseOutputs['PLAN'] }) {
  const { t } = useTranslation()
  return (
    <div className="@container">
      <ol className="grid grid-cols-1 gap-3 @3xl:grid-cols-3">
        {plan.posts.map((post) => (
          <li
            key={post.index}
            className="space-y-2 rounded-lg border p-3 text-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">
                {t('posts.post', { index: post.index })}
              </span>
              <Badge variant="neutral">
                {t(`brief.formatTypes.${post.format}`)}
              </Badge>
            </div>
            <Field label={t('posts.goal')}>{post.goal}</Field>
            <Field label={t('posts.product')}>{post.product}</Field>
            <Field label={t('posts.concept')}>{post.concept}</Field>
            <Field label={t('posts.rationale')}>{post.rationale}</Field>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p>{children}</p>
    </div>
  )
}

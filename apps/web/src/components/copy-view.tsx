import type { PhaseOutputs } from '@ai-post-recipe/shared'
import { TriangleAlertIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** Caption, hashtags and slide texts per post, with the facts no source contains. */
export function CopyView({ copy }: { copy: PhaseOutputs['COPY'] }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4 text-sm">
      {copy.unsupported.length > 0 && (
        <div
          role="note"
          className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-200"
        >
          <p className="flex items-center gap-2 font-medium">
            <TriangleAlertIcon className="size-4" />
            {t('copy.unsupported', { count: copy.unsupported.length })}
          </p>
          <ul className="list-inside list-disc">
            {copy.unsupported.map((fact, i) => (
              <li key={i}>
                {t('posts.post', { index: fact.postIndex })},{' '}
                {fact.place === 'caption'
                  ? t('copy.caption')
                  : t('copy.slide', { order: fact.place })}
                : <strong>{fact.value}</strong>{' '}
                <span className="opacity-80">({fact.context})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="@container">
        <ol className="grid gap-3 @3xl:grid-cols-3">
          {copy.posts.map((post) => (
            <li key={post.index} className="space-y-3 rounded-lg border p-3">
              <p className="font-semibold">
                {t('posts.post', { index: post.index })}
              </p>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t('copy.slides')}
                </p>
                <ol className="mt-1 space-y-1">
                  {post.slides.map((slide) => (
                    <li
                      key={slide.order}
                      className="rounded-md bg-muted px-2 py-1"
                    >
                      <span className="mr-1 text-xs text-muted-foreground tabular-nums">
                        {slide.order}.
                      </span>
                      {slide.text}
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t('copy.caption')}
                </p>
                <p className="whitespace-pre-line">{post.caption}</p>
              </div>
              <p className="text-sky-700 dark:text-sky-300">
                {post.hashtags.join(' ')}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

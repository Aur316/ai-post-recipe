import { useState } from 'react'

import type { AssetDto, PostDto } from '@ai-post-recipe/shared'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ImageIcon,
  PencilIcon,
  RefreshCwIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'

import { cn } from '@/lib/utils'

import { assetsQueryFunctions } from '@/data/query-functions/assets'
import { useRegenerateSlide } from '@/hooks/queries/posts/useRegenerateSlide'
import { useUpdatePost } from '@/hooks/queries/posts/useUpdatePost'

interface PostPreviewProps {
  runId: string
  post: PostDto
  brandName: string
  logo?: AssetDto
  /** Editing and regenerating are off while a phase runs. */
  locked: boolean
}

/** One post as it would look on Instagram: the rendered slides, then the caption. */
export function PostPreview({
  runId,
  post,
  brandName,
  logo,
  locked,
}: PostPreviewProps) {
  const { t } = useTranslation()
  const slides = post.slides.filter((s) => s.assetId)
  const [current, setCurrent] = useState(0)
  const slide = slides[Math.min(current, slides.length - 1)]
  const story = post.format === 'STORY'

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border bg-card text-sm">
      <header className="flex min-w-0 items-center gap-2 border-b px-3 py-2">
        {logo ? (
          <img
            src={assetsQueryFunctions.url(logo.id)}
            alt=""
            className="size-8 shrink-0 rounded-full border bg-white object-contain p-0.5"
          />
        ) : (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-semibold">
            {brandName.slice(0, 1)}
          </span>
        )}
        <span
          className="min-w-0 flex-1 truncate font-semibold"
          title={brandName}
        >
          {brandName}
        </span>
        <Badge variant="neutral" className="shrink-0">
          {t('posts.post', { index: post.index })} ·{' '}
          {t(`brief.formatTypes.${post.format}`)}
        </Badge>
      </header>

      <div
        className={cn(
          'relative bg-muted',
          story ? 'aspect-[9/16]' : 'aspect-[4/5]',
        )}
      >
        {slide?.assetId ? (
          <img
            src={assetsQueryFunctions.url(slide.assetId)}
            alt={slide.text}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
            <ImageIcon className="size-8" />
            {t('posts.noSlides')}
          </div>
        )}
        {slides.length > 1 && (
          <>
            <SlideButton
              side="left"
              label={t('posts.previous')}
              disabled={current === 0}
              onClick={() => setCurrent((c) => c - 1)}
            />
            <SlideButton
              side="right"
              label={t('posts.next')}
              disabled={current >= slides.length - 1}
              onClick={() => setCurrent((c) => c + 1)}
            />
            <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1">
              {slides.map((s, i) => (
                <span
                  key={s.order}
                  className={cn(
                    'size-1.5 rounded-full',
                    i === current ? 'bg-white' : 'bg-white/50',
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {slide && (
        <RegenerateSlide
          runId={runId}
          index={post.index}
          order={slide.order}
          disabled={locked}
        />
      )}
      <Caption runId={runId} post={post} disabled={locked} />
    </article>
  )
}

function SlideButton({
  side,
  label,
  disabled,
  onClick,
}: {
  side: 'left' | 'right'
  label: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="secondary"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'absolute top-1/2 -translate-y-1/2 rounded-full opacity-90',
        side === 'left' ? 'left-2' : 'right-2',
      )}
    >
      {side === 'left' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
    </Button>
  )
}

function RegenerateSlide({
  runId,
  index,
  order,
  disabled,
}: {
  runId: string
  index: number
  order: number
  disabled: boolean
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [instruction, setInstruction] = useState('')
  const regenerate = useRegenerateSlide()

  if (!open) {
    return (
      <div className="border-b px-3 py-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled}
          onClick={() => setOpen(true)}
        >
          <RefreshCwIcon />
          {t('posts.regenerate', { order })}
        </Button>
      </div>
    )
  }
  return (
    <form
      className="flex gap-2 border-b px-3 py-2"
      onSubmit={(e) => {
        e.preventDefault()
        regenerate.mutate(
          { runId, index, order, instruction },
          {
            onSuccess: () => {
              setOpen(false)
              setInstruction('')
            },
          },
        )
      }}
    >
      <Input
        aria-label={t('posts.instruction')}
        placeholder={t('posts.instructionPlaceholder')}
        value={instruction}
        maxLength={300}
        onChange={(e) => setInstruction(e.target.value)}
      />
      <Button type="submit" size="sm" disabled={regenerate.isPending}>
        {regenerate.isPending ? <Spinner /> : <RefreshCwIcon />}
        {t('posts.regenerateShort')}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={regenerate.isPending}
        onClick={() => setOpen(false)}
      >
        {t('common.cancel')}
      </Button>
    </form>
  )
}

function Caption({
  runId,
  post,
  disabled,
}: {
  runId: string
  post: PostDto
  disabled: boolean
}) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [caption, setCaption] = useState(post.caption ?? '')
  const [hashtags, setHashtags] = useState(post.hashtags.join(' '))
  const update = useUpdatePost()

  if (!post.caption) {
    return <p className="p-3 text-muted-foreground">{t('posts.noCaption')}</p>
  }
  if (!editing) {
    return (
      // Grows to the bottom of the card, so the edit buttons of all posts line up.
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="whitespace-pre-line">
          <span className="font-semibold">{post.product}</span> {post.caption}
        </p>
        <p className="text-sky-700 dark:text-sky-300">
          {post.hashtags.join(' ')}
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="mt-auto self-start"
          disabled={disabled}
          onClick={() => {
            setCaption(post.caption ?? '')
            setHashtags(post.hashtags.join(' '))
            setEditing(true)
          }}
        >
          <PencilIcon />
          {t('posts.editCaption')}
        </Button>
      </div>
    )
  }
  return (
    <form
      className="space-y-2 p-3"
      onSubmit={(e) => {
        e.preventDefault()
        update.mutate(
          {
            runId,
            index: post.index,
            caption,
            hashtags: hashtags.split(/\s+/).filter(Boolean),
          },
          { onSuccess: () => setEditing(false) },
        )
      }}
    >
      <Textarea
        aria-label={t('posts.caption')}
        value={caption}
        maxLength={2200}
        className="min-h-32"
        onChange={(e) => setCaption(e.target.value)}
      />
      <Input
        aria-label={t('posts.hashtags')}
        value={hashtags}
        onChange={(e) => setHashtags(e.target.value)}
      />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setEditing(false)}
        >
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={update.isPending || !caption.trim()}
        >
          {t('posts.save')}
        </Button>
      </div>
    </form>
  )
}

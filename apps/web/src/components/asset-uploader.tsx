import { useRef, useState } from 'react'

import { type StyleSource, UploadAssetKind } from '@ai-post-recipe/shared'
import { FileIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { cn } from '@/lib/utils'

import {
  type PendingUpload,
  allowedKinds,
  rejectReason,
  toPendingUpload,
} from '@/utils/uploads'

interface AssetUploaderProps {
  uploads: Array<PendingUpload>
  onChange: (uploads: Array<PendingUpload>) => void
  disabled?: boolean
  styleSource?: StyleSource
}

export function AssetUploader({
  uploads,
  onChange,
  disabled,
  styleSource = 'UPLOADS',
}: AssetUploaderProps) {
  const { t } = useTranslation()
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const add = (files: FileList | null) => {
    if (files)
      onChange([
        ...uploads,
        ...Array.from(files).map((f) => toPendingUpload(f, styleSource)),
      ])
  }

  const setKind = (id: string, kind: UploadAssetKind) =>
    onChange(uploads.map((u) => (u.id === id ? { ...u, kind } : u)))

  const remove = (upload: PendingUpload) => {
    URL.revokeObjectURL(upload.previewUrl)
    onChange(uploads.filter((u) => u.id !== upload.id))
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label={t('uploader.addFiles')}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!disabled) add(e.dataTransfer.files)
        }}
        className={cn(
          'cursor-pointer rounded-lg border-2 border-dashed p-6 text-center text-sm text-muted-foreground transition-colors',
          dragging && 'border-primary bg-muted',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        {styleSource === 'WEBSITE'
          ? t('uploader.dropHintWebsite')
          : t('uploader.dropHint')}
        <input
          ref={input}
          type="file"
          multiple
          hidden
          data-testid="file-input"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={(e) => {
            add(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      <ul className="space-y-2">
        {uploads.map((upload) => {
          const error =
            rejectReason(upload.file, upload.kind, styleSource) ?? upload.error
          return (
            <li
              key={upload.id}
              className="flex items-center gap-3 rounded-md border p-2"
            >
              {upload.file.type.startsWith('image/') ? (
                <img
                  src={upload.previewUrl}
                  alt=""
                  className="size-12 shrink-0 rounded object-cover"
                />
              ) : (
                <div className="flex size-12 shrink-0 items-center justify-center rounded bg-muted">
                  <FileIcon className="size-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-sm">{upload.file.name}</p>
                {upload.status === 'uploading' && (
                  <Progress value={upload.progress} />
                )}
                {upload.status === 'done' && (
                  <p className="text-sm text-muted-foreground">
                    {t('uploader.uploaded')}
                  </p>
                )}
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <Select
                value={upload.kind}
                disabled={disabled}
                onValueChange={(kind) =>
                  setKind(upload.id, UploadAssetKind.parse(kind))
                }
              >
                <SelectTrigger
                  className="w-48"
                  aria-label={t('uploader.fileType')}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedKinds(styleSource).map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {t(`assets.kinds.${kind}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => remove(upload)}
              >
                {t('common.remove')}
              </Button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

import { useState } from 'react'

import type { AssetDto, UploadAssetKind } from '@ai-post-recipe/shared'
import { Trash2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

import { assetsQueryFunctions } from '@/data/query-functions/assets'
import { useDeleteAsset } from '@/hooks/queries/assets/useDeleteAsset'

interface AssetGridProps {
  runId: string
  assets: Array<AssetDto>
  removable?: boolean
}

export function AssetGrid({ runId, assets, removable }: AssetGridProps) {
  const { t } = useTranslation()
  const [toRemove, setToRemove] = useState<AssetDto>()
  const kindLabel = (kind: AssetDto['kind']) =>
    kind.startsWith('UPLOAD_')
      ? t(`assets.kinds.${kind as UploadAssetKind}`)
      : kind
  const deleteAsset = useDeleteAsset()

  if (assets.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('assets.none')}</p>
  }

  const confirmRemove = () => {
    if (!toRemove) return
    deleteAsset.mutate(
      { id: toRemove.id, runId },
      { onSuccess: () => setToRemove(undefined) },
    )
  }

  return (
    <>
      <div className="@container">
        <ul className="grid grid-cols-2 gap-4 @lg:grid-cols-3 @2xl:grid-cols-4">
          {assets.map((asset) => (
            <li key={asset.id} className="space-y-1">
              <div className="relative">
                <img
                  src={assetsQueryFunctions.url(asset.id)}
                  alt={kindLabel(asset.kind)}
                  className="aspect-square w-full rounded-md border object-cover"
                />
                {removable && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2"
                    aria-label={t('assets.removeLabel', {
                      kind: kindLabel(asset.kind).toLowerCase(),
                    })}
                    onClick={() => setToRemove(asset)}
                  >
                    <Trash2Icon />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {kindLabel(asset.kind)}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <AlertDialog
        open={!!toRemove}
        onOpenChange={(open) => {
          if (!open && !deleteAsset.isPending) setToRemove(undefined)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('assets.removeTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('assets.removeDescription', {
                kind: toRemove ? kindLabel(toRemove.kind).toLowerCase() : '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {toRemove && (
            <img
              src={assetsQueryFunctions.url(toRemove.id)}
              alt=""
              className="mx-auto max-h-40 rounded-md border object-contain"
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAsset.isPending}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteAsset.isPending}
              onClick={(e) => {
                e.preventDefault()
                confirmRemove()
              }}
            >
              {deleteAsset.isPending
                ? t('assets.removing')
                : t('common.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

import { useState } from 'react'

import type { RunDetailDto } from '@ai-post-recipe/shared'
import { Trash2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

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

import { useDeleteRun } from '@/hooks/queries/runs/useDeleteRun'
import { useLocalizedPath } from '@/hooks/useLocalizedPath'

/** Deletes the whole run after a confirmation; not possible while a phase runs. */
export function DeleteRunButton({ run }: { run: RunDetailDto }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const deleteRun = useDeleteRun()
  const navigate = useNavigate()
  const localized = useLocalizedPath()

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={run.status === 'RUNNING'}
        onClick={() => setOpen(true)}
      >
        <Trash2Icon />
        {t('deleteRun.button')}
      </Button>
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (!deleteRun.isPending) setOpen(next)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('deleteRun.title', { brand: run.brandName })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteRun.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteRun.isPending}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteRun.isPending}
              onClick={(e) => {
                // Keep the dialog open until the run is gone.
                e.preventDefault()
                deleteRun.mutate(run.id, {
                  onSuccess: () =>
                    void navigate(localized('/'), { replace: true }),
                })
              }}
            >
              {deleteRun.isPending
                ? t('deleteRun.deleting')
                : t('deleteRun.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

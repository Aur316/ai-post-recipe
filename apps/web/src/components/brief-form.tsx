import { useEffect, useMemo, useState } from 'react'

import {
  BRIEF_LIMITS,
  type Brief,
  type BriefMessages,
  LinkType,
  PostFormat,
  type RunDetailDto,
  createBriefSchema,
} from '@ai-post-recipe/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { type TFunction } from 'i18next'
import {
  Controller,
  type FieldPath,
  useFieldArray,
  useForm,
  useWatch,
} from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { z } from 'zod'

import { AssetGrid } from '@/components/asset-grid'
import { AssetUploader } from '@/components/asset-uploader'
import { CharCount } from '@/components/char-count'
import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

import { useUploadAsset } from '@/hooks/queries/assets/useUploadAsset'
import { useCreateRun } from '@/hooks/queries/runs/useCreateRun'
import { useUpdateRun } from '@/hooks/queries/runs/useUpdateRun'
import { useLocalizedPath } from '@/hooks/useLocalizedPath'
import { getApiErrorMessage } from '@/utils/helpers'
import { type PendingUpload, rejectReason } from '@/utils/uploads'

const briefMessages = (t: TFunction): BriefMessages => ({
  url: t('validation.url'),
  tooLong: (max) => t('validation.tooLong', { max }),
  brandNameRequired: t('validation.brandNameRequired'),
  instagramProfile: t('validation.instagramProfile'),
  reasonTooShort: t('validation.reasonTooShort'),
  linksRequired: t('validation.linksRequired'),
  productNameRequired: t('validation.productNameRequired'),
  productsRequired: t('validation.productsRequired'),
  audienceRequired: t('validation.audienceRequired'),
  goalsRequired: t('validation.goalsRequired'),
})

const createFormSchema = (t: TFunction) =>
  createBriefSchema(briefMessages(t)).extend({
    inspirationLinks: z.array(
      z.object({ url: z.url({ error: t('validation.url') }) }),
    ),
  })
type FormSchema = ReturnType<typeof createFormSchema>
type FormInput = z.input<FormSchema>
type FormOutput = z.output<FormSchema>

const STEPS = [
  { title: 'brand', fields: ['brandName', 'instagramUrl', 'reason'] },
  { title: 'sources', fields: ['links', 'products'] },
  {
    title: 'audience',
    fields: ['audience', 'goals', 'inspiration', 'inspirationLinks'],
  },
  { title: 'output', fields: ['language', 'formats', 'styleSource'] },
] as const satisfies ReadonlyArray<{
  title: string
  fields: ReadonlyArray<FieldPath<FormInput>>
}>

const DEFAULT_VALUES: FormInput = {
  brandName: '',
  instagramUrl: '',
  reason: '',
  links: [{ type: 'WEBSITE', url: '' }],
  products: [{ name: '', url: '' }],
  audience: '',
  goals: '',
  inspiration: '',
  inspirationLinks: [],
  language: 'hr',
  formats: [],
  styleSource: 'UPLOADS',
}

function toFormValues(brief: Brief): FormInput {
  return {
    ...brief,
    products: brief.products.map((p) => ({ name: p.name, url: p.url ?? '' })),
    inspirationLinks: brief.inspirationLinks.map((url) => ({ url })),
  }
}

interface BriefFormProps {
  run?: RunDetailDto
}

export function BriefForm({ run }: BriefFormProps) {
  const [step, setStep] = useState(0)
  const [uploads, setUploads] = useState<Array<PendingUpload>>([])
  const [runId, setRunId] = useState<string>()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const localized = useLocalizedPath()
  const createRun = useCreateRun()
  const updateRun = useUpdateRun()
  const uploadAsset = useUploadAsset()

  const { language } = i18n
  const schema = useMemo(
    () => createFormSchema(i18n.getFixedT(language)),
    [i18n, language],
  )
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: run ? toFormValues(run.brief) : DEFAULT_VALUES,
    mode: 'onTouched',
  })
  const {
    register,
    control,
    formState: { errors, isSubmitting },
  } = form
  useEffect(() => {
    const invalid = Object.keys(form.formState.errors) as Array<
      FieldPath<FormInput>
    >
    if (invalid.length) void form.trigger(invalid)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on a language switch
  }, [schema])

  const links = useFieldArray({ control, name: 'links' })
  const products = useFieldArray({ control, name: 'products' })
  const inspirationLinks = useFieldArray({ control, name: 'inspirationLinks' })

  const isLastStep = step === STEPS.length - 1
  const styleSource = useWatch({ control, name: 'styleSource' })
  const hasInvalidFiles = uploads.some((u) =>
    rejectReason(u.file, u.kind, styleSource ?? 'UPLOADS'),
  )

  const next = async () => {
    if (await form.trigger([...(STEPS[step]?.fields ?? [])])) setStep(step + 1)
  }

  const patchUpload = (id: string, patch: Partial<PendingUpload>) =>
    setUploads((all) => all.map((u) => (u.id === id ? { ...u, ...patch } : u)))

  const submit = form.handleSubmit(async ({ inspirationLinks, ...values }) => {
    const brief = {
      ...values,
      inspirationLinks: inspirationLinks.map((l) => l.url),
    }
    let id = runId
    if (!id && run) id = (await updateRun.mutateAsync({ id: run.id, brief })).id
    if (!id) id = (await createRun.mutateAsync(brief)).id
    setRunId(id)

    let failed = false
    for (const upload of uploads.filter((u) => u.status !== 'done')) {
      patchUpload(upload.id, { status: 'uploading', error: undefined })
      try {
        await uploadAsset.mutateAsync({
          runId: id,
          file: upload.file,
          kind: upload.kind,
          onProgress: (progress) => patchUpload(upload.id, { progress }),
        })
        patchUpload(upload.id, { status: 'done' })
      } catch (error) {
        failed = true
        patchUpload(upload.id, {
          status: 'failed',
          error: getApiErrorMessage(error, t('uploader.uploadFailed')),
        })
      }
    }

    if (!failed) await navigate(localized(`/runs/${id}`))
  })

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="space-y-6">
      <ol className="flex flex-wrap gap-4 text-sm">
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            className={i === step ? 'font-semibold' : 'text-muted-foreground'}
          >
            {i + 1}. {t(`brief.steps.${s.title}`)}
          </li>
        ))}
      </ol>

      <Card>
        <CardHeader>
          <CardTitle>
            {t(`brief.steps.${STEPS[step]?.title ?? 'brand'}`)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <FormField
                label={t('brief.brandName')}
                htmlFor="brandName"
                error={errors.brandName?.message}
              >
                <Input
                  id="brandName"
                  placeholder={t('brief.brandNamePlaceholder')}
                  maxLength={BRIEF_LIMITS.brandName}
                  {...register('brandName')}
                />
                <CharCount
                  control={control}
                  name="brandName"
                  max={BRIEF_LIMITS.brandName}
                />
              </FormField>
              <FormField
                label={t('brief.instagramUrl')}
                htmlFor="instagramUrl"
                error={errors.instagramUrl?.message}
              >
                <Input
                  id="instagramUrl"
                  placeholder="https://www.instagram.com/gymbeamhr/"
                  maxLength={BRIEF_LIMITS.url}
                  {...register('instagramUrl')}
                />
                <CharCount
                  control={control}
                  name="instagramUrl"
                  max={BRIEF_LIMITS.url}
                />
              </FormField>
              <FormField
                label={t('brief.reason')}
                htmlFor="reason"
                error={errors.reason?.message}
              >
                <Textarea
                  id="reason"
                  placeholder={t('brief.reasonPlaceholder')}
                  maxLength={BRIEF_LIMITS.reason}
                  {...register('reason')}
                />
                <CharCount
                  control={control}
                  name="reason"
                  max={BRIEF_LIMITS.reason}
                />
              </FormField>
            </>
          )}

          {step === 1 && (
            <>
              <FormField
                label={t('brief.links')}
                error={errors.links?.root?.message ?? errors.links?.message}
              >
                {links.fields.map((field, i) => (
                  <div key={field.id} className="space-y-1">
                    <div className="flex items-start gap-2">
                      <Controller
                        control={control}
                        name={`links.${i}.type`}
                        render={({ field: f }) => (
                          <Select value={f.value} onValueChange={f.onChange}>
                            <SelectTrigger
                              className="w-36"
                              aria-label={t('brief.linkType')}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LinkType.options.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {t(`brief.linkTypes.${type}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <div className="flex-1 space-y-1">
                        <Input
                          aria-label={t('brief.linkUrl', { n: i + 1 })}
                          placeholder="https://"
                          maxLength={BRIEF_LIMITS.url}
                          {...register(`links.${i}.url`)}
                        />
                        <CharCount
                          control={control}
                          name={`links.${i}.url`}
                          max={BRIEF_LIMITS.url}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => links.remove(i)}
                      >
                        {t('common.remove')}
                      </Button>
                    </div>
                    <FieldError message={errors.links?.[i]?.url?.message} />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => links.append({ type: 'SHOP', url: '' })}
                >
                  {t('brief.addLink')}
                </Button>
              </FormField>

              <FormField
                label={t('brief.products')}
                error={
                  errors.products?.root?.message ?? errors.products?.message
                }
              >
                {products.fields.map((field, i) => (
                  <div key={field.id} className="space-y-1">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-1">
                        <Input
                          aria-label={t('brief.productName', { n: i + 1 })}
                          placeholder={t('brief.productNamePlaceholder')}
                          maxLength={BRIEF_LIMITS.productName}
                          {...register(`products.${i}.name`)}
                        />
                        <CharCount
                          control={control}
                          name={`products.${i}.name`}
                          max={BRIEF_LIMITS.productName}
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Input
                          aria-label={t('brief.productPage', { n: i + 1 })}
                          placeholder={t('brief.productPagePlaceholder')}
                          maxLength={BRIEF_LIMITS.url}
                          {...register(`products.${i}.url`)}
                        />
                        <CharCount
                          control={control}
                          name={`products.${i}.url`}
                          max={BRIEF_LIMITS.url}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => products.remove(i)}
                      >
                        {t('common.remove')}
                      </Button>
                    </div>
                    <FieldError
                      message={
                        errors.products?.[i]?.name?.message ??
                        errors.products?.[i]?.url?.message
                      }
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => products.append({ name: '', url: '' })}
                >
                  {t('brief.addProduct')}
                </Button>
              </FormField>
            </>
          )}

          {step === 2 && (
            <>
              <FormField
                label={t('brief.audience')}
                htmlFor="audience"
                error={errors.audience?.message}
              >
                <Textarea
                  id="audience"
                  placeholder={t('brief.audiencePlaceholder')}
                  maxLength={BRIEF_LIMITS.audience}
                  {...register('audience')}
                />
                <CharCount
                  control={control}
                  name="audience"
                  max={BRIEF_LIMITS.audience}
                />
              </FormField>
              <FormField
                label={t('brief.goals')}
                htmlFor="goals"
                error={errors.goals?.message}
              >
                <Textarea
                  id="goals"
                  placeholder={t('brief.goalsPlaceholder')}
                  maxLength={BRIEF_LIMITS.goals}
                  {...register('goals')}
                />
                <CharCount
                  control={control}
                  name="goals"
                  max={BRIEF_LIMITS.goals}
                />
              </FormField>
              <FormField label={t('brief.inspiration')} htmlFor="inspiration">
                <Textarea
                  id="inspiration"
                  placeholder={t('brief.inspirationPlaceholder')}
                  maxLength={BRIEF_LIMITS.inspiration}
                  {...register('inspiration')}
                />
                <CharCount
                  control={control}
                  name="inspiration"
                  max={BRIEF_LIMITS.inspiration}
                />
              </FormField>
              <FormField label={t('brief.inspirationLinks')}>
                {inspirationLinks.fields.map((field, i) => (
                  <div key={field.id} className="space-y-1">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-1">
                        <Input
                          aria-label={t('brief.inspirationLink', { n: i + 1 })}
                          placeholder="https://"
                          maxLength={BRIEF_LIMITS.url}
                          {...register(`inspirationLinks.${i}.url`)}
                        />
                        <CharCount
                          control={control}
                          name={`inspirationLinks.${i}.url`}
                          max={BRIEF_LIMITS.url}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => inspirationLinks.remove(i)}
                      >
                        {t('common.remove')}
                      </Button>
                    </div>
                    <FieldError
                      message={errors.inspirationLinks?.[i]?.url?.message}
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => inspirationLinks.append({ url: '' })}
                >
                  {t('brief.addInspirationLink')}
                </Button>
              </FormField>
            </>
          )}

          {step === 3 && (
            <>
              <FormField label={t('brief.outputLanguage')}>
                <p className="text-sm text-muted-foreground">
                  {t('brief.outputLanguageHint')}
                </p>
                <Controller
                  control={control}
                  name="language"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        className="w-48"
                        aria-label={t('brief.outputLanguage')}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hr">
                          {t('outputLanguage.hr')}
                        </SelectItem>
                        <SelectItem value="en">
                          {t('outputLanguage.en')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <Controller
                control={control}
                name="styleSource"
                render={({ field }) => (
                  <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
                    <div className="space-y-1">
                      <label
                        htmlFor="styleSource"
                        className="text-sm font-medium"
                      >
                        {t('brief.styleFromWebsite')}
                      </label>
                      <p className="text-sm text-muted-foreground">
                        {field.value === 'WEBSITE'
                          ? t('brief.styleFromWebsiteOn')
                          : t('brief.styleFromWebsiteOff')}
                      </p>
                    </div>
                    <Switch
                      id="styleSource"
                      checked={field.value === 'WEBSITE'}
                      onCheckedChange={(on) =>
                        field.onChange(on ? 'WEBSITE' : 'UPLOADS')
                      }
                    />
                  </div>
                )}
              />
              <FormField label={t('brief.formats')}>
                <Controller
                  control={control}
                  name="formats"
                  render={({ field }) => {
                    const selected = field.value ?? []
                    return (
                      <div className="flex gap-4">
                        {PostFormat.options.map((format) => (
                          <label
                            key={format}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Checkbox
                              checked={selected.includes(format)}
                              onCheckedChange={(checked) =>
                                field.onChange(
                                  checked
                                    ? [...selected, format]
                                    : selected.filter((f) => f !== format),
                                )
                              }
                            />
                            {t(`brief.formatTypes.${format}`)}
                          </label>
                        ))}
                      </div>
                    )
                  }}
                />
              </FormField>
              {run && run.assets.length > 0 && (
                <FormField label={t('brief.uploadedReferences')}>
                  <AssetGrid runId={run.id} assets={run.assets} removable />
                </FormField>
              )}
              <FormField
                label={
                  styleSource === 'WEBSITE'
                    ? t('brief.uploadsWebsite')
                    : t('brief.uploads')
                }
              >
                <AssetUploader
                  uploads={uploads}
                  onChange={setUploads}
                  disabled={isSubmitting}
                  styleSource={styleSource ?? 'UPLOADS'}
                />
              </FormField>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={step === 0 || isSubmitting}
          onClick={() => setStep(step - 1)}
        >
          {t('brief.back')}
        </Button>
        {isLastStep ? (
          <Button
            key="submit"
            type="submit"
            disabled={isSubmitting || hasInvalidFiles}
          >
            {submitLabel(t, { editing: !!run, saved: !!runId, isSubmitting })}
          </Button>
        ) : (
          <Button key="next" type="button" onClick={() => void next()}>
            {t('brief.next')}
          </Button>
        )}
      </div>
    </form>
  )
}

function submitLabel(
  t: TFunction,
  {
    editing,
    saved,
    isSubmitting,
  }: { editing: boolean; saved: boolean; isSubmitting: boolean },
) {
  if (isSubmitting) return editing ? t('brief.saving') : t('brief.creating')
  if (saved) return t('brief.retryUploads')
  return editing ? t('brief.save') : t('brief.create')
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null
}

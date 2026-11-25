import { useState } from 'react'

import {
  BRIEF_LIMITS,
  Brief,
  LinkType,
  PostFormat,
} from '@ai-post-recipe/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Controller,
  type FieldPath,
  useFieldArray,
  useForm,
} from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'

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
import { Textarea } from '@/components/ui/textarea'

import { useUploadAsset } from '@/hooks/queries/assets/useUploadAsset'
import { useCreateRun } from '@/hooks/queries/runs/useCreateRun'
import { getApiErrorMessage } from '@/utils/helpers'
import { type PendingUpload, rejectReason } from '@/utils/uploads'

/** Field arrays need objects, so the form keeps inspiration links as { url }. */
const BriefFormSchema = Brief.extend({
  inspirationLinks: z.array(
    z.object({ url: z.url({ error: 'Enter a full http(s) URL' }) }),
  ),
})
type FormInput = z.input<typeof BriefFormSchema>
type FormOutput = z.output<typeof BriefFormSchema>

const LINK_LABELS: Record<LinkType, string> = {
  WEBSITE: 'Website',
  SHOP: 'Shop',
  CATALOG: 'Catalogue',
  OTHER: 'Other',
}

const FORMAT_LABELS: Record<PostFormat, string> = {
  IMAGE: 'Single image',
  CAROUSEL: 'Carousel',
  STORY: 'Story',
}

const STEPS: Array<{ title: string; fields: Array<FieldPath<FormInput>> }> = [
  { title: 'Brand', fields: ['brandName', 'instagramUrl', 'reason'] },
  { title: 'Sources and products', fields: ['links', 'products'] },
  {
    title: 'Audience and goals',
    fields: ['audience', 'goals', 'inspiration', 'inspirationLinks'],
  },
  { title: 'Output and references', fields: ['language', 'formats'] },
]

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
}

export function BriefForm() {
  const [step, setStep] = useState(0)
  const [uploads, setUploads] = useState<Array<PendingUpload>>([])
  const [runId, setRunId] = useState<string>()
  const navigate = useNavigate()
  const createRun = useCreateRun()
  const uploadAsset = useUploadAsset()

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(BriefFormSchema),
    defaultValues: DEFAULT_VALUES,
    // Validate a field when it loses focus, then live while it is corrected.
    mode: 'onTouched',
  })
  const {
    register,
    control,
    formState: { errors, isSubmitting },
  } = form
  const links = useFieldArray({ control, name: 'links' })
  const products = useFieldArray({ control, name: 'products' })
  const inspirationLinks = useFieldArray({ control, name: 'inspirationLinks' })

  const isLastStep = step === STEPS.length - 1
  const hasInvalidFiles = uploads.some((u) => rejectReason(u.file, u.kind))

  const next = async () => {
    if (await form.trigger(STEPS[step]?.fields)) setStep(step + 1)
  }

  const patchUpload = (id: string, patch: Partial<PendingUpload>) =>
    setUploads((all) => all.map((u) => (u.id === id ? { ...u, ...patch } : u)))

  /** Creates the run once, then uploads every file that is not uploaded yet. */
  const submit = form.handleSubmit(async ({ inspirationLinks, ...brief }) => {
    const id =
      runId ??
      (
        await createRun.mutateAsync({
          ...brief,
          inspirationLinks: inspirationLinks.map((l) => l.url),
        })
      ).id
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
          error: getApiErrorMessage(error, 'Upload failed'),
        })
      }
    }

    if (!failed) await navigate(`/runs/${id}`)
  })

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="space-y-6">
      <ol className="flex flex-wrap gap-4 text-sm">
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            className={i === step ? 'font-semibold' : 'text-muted-foreground'}
          >
            {i + 1}. {s.title}
          </li>
        ))}
      </ol>

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step]?.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <FormField
                label="Brand name"
                htmlFor="brandName"
                error={errors.brandName?.message}
              >
                <Input
                  id="brandName"
                  placeholder="e.g. GymBeam Hrvatska"
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
                label="Instagram profile URL"
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
                label="Why this brand?"
                htmlFor="reason"
                error={errors.reason?.message}
              >
                <Textarea
                  id="reason"
                  placeholder="e.g. A large Croatian sports nutrition brand with an active Instagram profile and a clear product range."
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
                label="Website, shop and catalogue links"
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
                              aria-label="Link type"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LinkType.options.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {LINK_LABELS[type]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <div className="flex-1 space-y-1">
                        <Input
                          aria-label={`Link ${i + 1} URL`}
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
                        Remove
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
                  Add link
                </Button>
              </FormField>

              <FormField
                label="Products to promote"
                error={
                  errors.products?.root?.message ?? errors.products?.message
                }
              >
                {products.fields.map((field, i) => (
                  <div key={field.id} className="space-y-1">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-1">
                        <Input
                          aria-label={`Product ${i + 1} name`}
                          placeholder="Product name"
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
                          aria-label={`Product ${i + 1} page`}
                          placeholder="Product page URL (optional)"
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
                        Remove
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
                  Add product
                </Button>
              </FormField>
            </>
          )}

          {step === 2 && (
            <>
              <FormField
                label="Target audience"
                htmlFor="audience"
                error={errors.audience?.message}
              >
                <Textarea
                  id="audience"
                  placeholder="e.g. Active adults 18–35 in Croatia who train in the gym"
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
                label="Goals"
                htmlFor="goals"
                error={errors.goals?.message}
              >
                <Textarea
                  id="goals"
                  placeholder="e.g. More saves and comments, interest in the new protein line"
                  maxLength={BRIEF_LIMITS.goals}
                  {...register('goals')}
                />
                <CharCount
                  control={control}
                  name="goals"
                  max={BRIEF_LIMITS.goals}
                />
              </FormField>
              <FormField
                label="Role models and inspiration (optional)"
                htmlFor="inspiration"
              >
                <Textarea
                  id="inspiration"
                  placeholder="e.g. Brands, creators or posts whose style you like"
                  maxLength={BRIEF_LIMITS.inspiration}
                  {...register('inspiration')}
                />
                <CharCount
                  control={control}
                  name="inspiration"
                  max={BRIEF_LIMITS.inspiration}
                />
              </FormField>
              <FormField label="Inspiration links (optional)">
                {inspirationLinks.fields.map((field, i) => (
                  <div key={field.id} className="space-y-1">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-1">
                        <Input
                          aria-label={`Inspiration link ${i + 1}`}
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
                        Remove
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
                  Add inspiration link
                </Button>
              </FormField>
            </>
          )}

          {step === 3 && (
            <>
              <FormField label="Output language">
                <Controller
                  control={control}
                  name="language"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        className="w-48"
                        aria-label="Output language"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hr">Croatian</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField label="Preferred formats (optional)">
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
                            {FORMAT_LABELS[format]}
                          </label>
                        ))}
                      </div>
                    )
                  }}
                />
              </FormField>
              <FormField label="Screenshots, product photos and logo">
                <AssetUploader
                  uploads={uploads}
                  onChange={setUploads}
                  disabled={isSubmitting}
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
          Back
        </Button>
        {isLastStep ? (
          <Button
            key="submit"
            type="submit"
            disabled={isSubmitting || hasInvalidFiles}
          >
            {isSubmitting
              ? 'Creating…'
              : runId
                ? 'Retry uploads'
                : 'Create run'}
          </Button>
        ) : (
          <Button key="next" type="button" onClick={() => void next()}>
            Next
          </Button>
        )}
      </div>
    </form>
  )
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null
}

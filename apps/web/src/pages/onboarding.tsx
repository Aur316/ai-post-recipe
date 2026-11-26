import { CheckCircle2Icon, CircleIcon, ExternalLinkIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { BackLink } from '@/components/back-link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { cn } from '@/lib/utils'

import { useGetHealth } from '@/hooks/queries/health/useGetHealth'
import { PAGE_WIDTH } from '@/utils/layout'
import { runsListPath } from '@/utils/runs-search'

/** Where to get the API keys and how to add them; the same steps as docs/onboarding.md. */
export function Onboarding() {
  const { t } = useTranslation()
  const { data: health } = useGetHealth()
  const llmSet = health?.providers.llm === 'openrouter'
  const searchSet = health?.providers.search === 'serper'

  return (
    <section className={cn(PAGE_WIDTH, 'space-y-6')}>
      <BackLink to={runsListPath()} label={t('runs.title')} />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{t('onboarding.title')}</h1>
        <p className="text-muted-foreground">{t('onboarding.intro')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('onboarding.status')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Status label="OPENROUTER_API_KEY" set={llmSet} loading={!health} />
          <Status
            label="SERPER_API_KEY"
            set={searchSet}
            loading={!health}
            optional
          />
        </CardContent>
      </Card>

      <Step
        title={t('onboarding.openrouter.title')}
        purpose={t('onboarding.openrouter.purpose')}
        steps={[
          {
            text: t('onboarding.openrouter.signIn'),
            href: 'https://openrouter.ai',
          },
          {
            text: t('onboarding.openrouter.credits'),
            href: 'https://openrouter.ai/settings/credits',
          },
          {
            text: t('onboarding.openrouter.key'),
            href: 'https://openrouter.ai/keys',
          },
          { text: t('onboarding.addToEnv') },
        ]}
        env="OPENROUTER_API_KEY=sk-or-v1-..."
      />

      <Step
        title={t('onboarding.serper.title')}
        purpose={t('onboarding.serper.purpose')}
        steps={[
          { text: t('onboarding.serper.signUp'), href: 'https://serper.dev' },
          {
            text: t('onboarding.serper.key'),
            href: 'https://serper.dev/api-key',
          },
          { text: t('onboarding.addToEnv') },
        ]}
        env="SERPER_API_KEY=..."
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('onboarding.restart.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            {t('onboarding.restart.intro')}
          </p>
          <dl className="space-y-2">
            <div>
              <dt className="font-medium">pnpm dev</dt>
              <dd className="text-muted-foreground">
                {t('onboarding.restart.dev')}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Docker Compose</dt>
              <dd>
                <Code>docker compose --profile full up -d</Code>
              </dd>
            </div>
          </dl>
          <p className="text-muted-foreground">
            {t('onboarding.restart.check')}
          </p>
        </CardContent>
      </Card>
    </section>
  )
}

function Status({
  label,
  set,
  loading,
  optional,
}: {
  label: string
  set: boolean
  loading: boolean
  optional?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 font-mono text-xs">
        {set ? (
          <CheckCircle2Icon className="size-4 text-emerald-500" />
        ) : (
          <CircleIcon className="size-4 text-muted-foreground" />
        )}
        {label}
      </span>
      {!loading && (
        <Badge variant={set ? 'success' : optional ? 'neutral' : 'warning'}>
          {set
            ? t('onboarding.set')
            : optional
              ? t('onboarding.notSetOptional')
              : t('onboarding.notSet')}
        </Badge>
      )}
    </div>
  )
}

function Step({
  title,
  purpose,
  steps,
  env,
}: {
  title: string
  purpose: string
  steps: Array<{ text: string; href?: string }>
  env: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">{purpose}</p>
        <ol className="list-inside list-decimal space-y-2">
          {steps.map((step) => (
            <li key={step.text}>
              {step.text}{' '}
              {step.href && (
                <a
                  href={step.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 underline"
                >
                  {step.href.replace(/^https:\/\//, '')}
                  <ExternalLinkIcon className="size-3" />
                </a>
              )}
            </li>
          ))}
        </ol>
        <Code>{env}</Code>
      </CardContent>
    </Card>
  )
}

function Code({ children }: { children: string }) {
  return (
    <pre className="scrollbar-thin overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
      {children}
    </pre>
  )
}

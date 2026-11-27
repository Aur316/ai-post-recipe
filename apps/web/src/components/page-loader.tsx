import { useId } from 'react'

import { useTranslation } from 'react-i18next'

export function PageLoader() {
  const { t } = useTranslation()
  const tail = useId()
  return (
    <div role="status" className="flex justify-center py-20">
      <svg
        viewBox="0 0 40 40"
        aria-hidden="true"
        className="size-9 text-foreground [animation-duration:900ms] motion-safe:animate-spin"
      >
        <defs>
          <linearGradient id={tail} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle
          cx="20"
          cy="20"
          r="17"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth="2.5"
        />
        <path
          d="M20 3a17 17 0 0 1 17 17 17 17 0 0 1-17 17"
          fill="none"
          stroke={`url(#${tail})`}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  )
}

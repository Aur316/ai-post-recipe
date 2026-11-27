import type { CSSProperties } from 'react'

export type SlideFormat = 'IMAGE' | 'CAROUSEL' | 'STORY'
export type SlideLayout = 'cover' | 'text' | 'closing'

export const SLIDE_SIZES = {
  feed: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
} as const

export const sizeFor = (format: SlideFormat) =>
  format === 'STORY' ? SLIDE_SIZES.story : SLIDE_SIZES.feed

export const aspectRatioFor = (format: SlideFormat) =>
  format === 'STORY' ? '9:16' : '4:5'

export interface BrandTokens {
  primary: string
  onPrimary: string
  fontFamily: string
}

export interface SlideProps {
  format: SlideFormat
  layout: SlideLayout
  text: string
  order: number
  total: number
  brandName: string
  tokens: BrandTokens
  backgroundUrl?: string
  logoUrl?: string
}

export function layoutFor(order: number, total: number): SlideLayout {
  if (order === 1) return 'cover'
  if (order === total) return 'closing'
  return 'text'
}

const FALLBACK_PRIMARY = '#F97316'

function luminance(hex: string) {
  const channels = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  const [r = 0, g = 0, b = 0] = channels
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function saturation(hex: string) {
  const values = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return Math.max(...values) - Math.min(...values)
}

export function brandTokens(
  colors: Array<{ hex: string }>,
  fontFamily = 'Geist, system-ui, sans-serif',
): BrandTokens {
  const valid = colors
    .map((c) => c.hex.toUpperCase())
    .filter((hex) => /^#[0-9A-F]{6}$/.test(hex))
  const primary =
    [...valid]
      .sort((a, b) => saturation(b) - saturation(a))
      .find((hex) => saturation(hex) > 40) ?? FALLBACK_PRIMARY
  const onPrimary = luminance(primary) > 0.45 ? '#111111' : '#FFFFFF'
  return { primary, onPrimary, fontFamily }
}

const keepRangesTogether = (text: string) =>
  text.replace(/(\d)\s*([–-])\s*(\d)/g, '$1\u2060$2\u2060$3')

function fontSize(text: string, layout: SlideLayout, story: boolean) {
  const base = layout === 'text' ? 76 : 84
  const length = text.length
  const size =
    length < 40
      ? base
      : length < 90
        ? base * 0.8
        : length < 160
          ? base * 0.64
          : base * 0.52
  return Math.round(story ? size * 1.1 : size)
}

export function Slide(props: SlideProps) {
  const { width, height } = sizeFor(props.format)
  const story = props.format === 'STORY'
  const pad = story ? 96 : 80
  const safeTop = story ? 220 : pad
  const safeBottom = story ? 280 : pad

  const root: CSSProperties = {
    position: 'relative',
    width,
    height,
    overflow: 'hidden',
    fontFamily: props.tokens.fontFamily,
    color: '#FFFFFF',
    background: '#111111',
  }

  return (
    <div style={root} data-slide={`${props.layout}-${props.order}`}>
      {props.backgroundUrl && (
        <img
          src={props.backgroundUrl}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.82) 100%)',
        }}
      />

      <Header {...props} top={safeTop - (story ? 60 : 24)} pad={pad} />

      <div
        style={{
          position: 'absolute',
          left: pad,
          right: pad,
          bottom: safeBottom,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          gap: 32,
        }}
      >
        <div
          style={{
            width: 120,
            height: 12,
            borderRadius: 6,
            background: props.tokens.primary,
          }}
        />
        <p
          style={{
            margin: 0,
            fontSize: fontSize(props.text, props.layout, story),
            fontWeight: props.layout === 'text' ? 600 : 800,
            lineHeight: 1.12,
            letterSpacing: '-0.02em',
            textWrap: 'balance',
            textShadow: '0 2px 24px rgba(0,0,0,0.35)',
          }}
        >
          {keepRangesTogether(props.text)}
        </p>
        {props.layout === 'closing' && (
          <div
            style={{
              alignSelf: 'flex-start',
              padding: '20px 36px',
              borderRadius: 999,
              background: props.tokens.primary,
              color: props.tokens.onPrimary,
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            {props.brandName}
          </div>
        )}
      </div>
    </div>
  )
}

function Header(props: SlideProps & { top: number; pad: number }) {
  const showCounter = props.total > 1
  return (
    <div
      style={{
        position: 'absolute',
        top: props.top,
        left: props.pad,
        right: props.pad,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {props.logoUrl ? (
        <div
          style={{
            background: 'rgba(255,255,255,0.92)',
            borderRadius: 20,
            padding: '14px 22px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <img
            src={props.logoUrl}
            alt=""
            data-logo
            style={{ height: 64, maxWidth: 360, objectFit: 'contain' }}
          />
        </div>
      ) : (
        <span
          style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.02em' }}
        >
          {props.brandName}
        </span>
      )}
      {showCounter && (
        <span
          style={{
            fontSize: 36,
            fontWeight: 700,
            padding: '10px 24px',
            borderRadius: 999,
            background: 'rgba(0,0,0,0.45)',
          }}
        >
          {props.order}/{props.total}
        </span>
      )}
    </div>
  )
}

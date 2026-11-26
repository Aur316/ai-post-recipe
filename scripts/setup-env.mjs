import { appendFileSync, copyFileSync, existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const examplePath = join(root, '.env.example')
const envPath = join(root, '.env')

const KEY = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/

function variables(text) {
  const lines = new Map()
  for (const line of text.split(/\r?\n/)) {
    const match = KEY.exec(line)
    if (match) lines.set(match[1], line)
  }
  return lines
}

function main() {
  if (process.env.CI) return
  if (!existsSync(examplePath)) return

  if (!existsSync(envPath)) {
    copyFileSync(examplePath, envPath)
    console.log('[setup-env] Created .env from .env.example.')
    return
  }

  const current = variables(readFileSync(envPath, 'utf8'))
  const missing = [...variables(readFileSync(examplePath, 'utf8'))].filter(
    ([key]) => !current.has(key),
  )
  if (missing.length === 0) return

  const text = readFileSync(envPath, 'utf8')
  const separator = text.length === 0 || text.endsWith('\n') ? '' : '\n'
  appendFileSync(
    envPath,
    `${separator}\n# Added from .env.example by pnpm install\n${missing
      .map(([, line]) => line)
      .join('\n')}\n`,
  )
  console.log(
    `[setup-env] Added to .env from .env.example: ${missing
      .map(([key]) => key)
      .join(', ')}. Check their values.`,
  )
}

try {
  main()
} catch (error) {
  console.warn(`[setup-env] Skipped: ${error.message}`)
}

import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export interface Prompt {
  id: string
  version: number
  model: string
  temperature?: number
  maxTokens: number
  system: string
  user: string
}

export interface RenderedPrompt {
  promptId: string
  model: string
  temperature?: number
  maxTokens: number
  system: string
  user: string
}

const PROMPTS_DIR = fileURLToPath(new URL('../prompts/', import.meta.url))

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/
const SECTION = /^#\s+(System|User)\s*$/im

export function parsePrompt(text: string, file = 'prompt'): Prompt {
  const match = FRONT_MATTER.exec(text)
  if (!match) throw new Error(`${file}: missing front matter`)
  const [, header = '', body = ''] = match

  const meta = new Map<string, string>()
  for (const line of header.split(/\r?\n/)) {
    const pair = /^\s*([a-zA-Z]+)\s*:\s*(.+?)\s*(#.*)?$/.exec(line)
    if (pair?.[1] && pair[2]) meta.set(pair[1], pair[2])
  }
  const required = (key: string) => {
    const value = meta.get(key)
    if (!value) throw new Error(`${file}: front matter needs "${key}"`)
    return value
  }

  const parts = body.split(SECTION)
  const sections = new Map<string, string>()
  for (let i = 1; i < parts.length; i += 2) {
    sections.set((parts[i] ?? '').toLowerCase(), (parts[i + 1] ?? '').trim())
  }
  const system = sections.get('system')
  const user = sections.get('user')
  if (!system || !user) {
    throw new Error(`${file}: needs a "# System" and a "# User" section`)
  }

  const version = Number(required('version'))
  if (!Number.isInteger(version) || version < 1) {
    throw new Error(`${file}: version must be a positive integer`)
  }
  const maxTokens = Number(meta.get('maxTokens') ?? '8000')
  if (!Number.isInteger(maxTokens) || maxTokens < 1) {
    throw new Error(`${file}: maxTokens must be a positive integer`)
  }
  const rawTemperature = meta.get('temperature')
  const temperature =
    rawTemperature === undefined ? undefined : Number(rawTemperature)
  if (temperature !== undefined && Number.isNaN(temperature)) {
    throw new Error(`${file}: temperature must be a number`)
  }

  return {
    id: required('id'),
    version,
    model: required('model'),
    ...(temperature === undefined ? {} : { temperature }),
    maxTokens,
    system,
    user,
  }
}

export function fill(template: string, values: Record<string, unknown>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name: string) => {
    if (!(name in values)) throw new Error(`Missing prompt value "${name}"`)
    const value = values[name]
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  })
}

export class PromptLibrary {
  private readonly prompts: Map<string, Prompt>

  constructor(
    prompts: Array<Prompt>,
    private readonly modelOverrides: Record<string, string | undefined> = {},
  ) {
    this.prompts = new Map(prompts.map((p) => [p.id, p]))
  }

  static load(env: Record<string, string | undefined> = {}, dir = PROMPTS_DIR) {
    const prompts = readdirSync(dir)
      .filter((file) => file.endsWith('.md'))
      .map((file) => parsePrompt(readFileSync(`${dir}/${file}`, 'utf8'), file))
    const overrides = Object.fromEntries(
      prompts.map((p) => [
        p.id,
        env[`MODEL_${p.id.toUpperCase()}`] || undefined,
      ]),
    )
    return new PromptLibrary(prompts, overrides)
  }

  get(id: string): Prompt {
    const prompt = this.prompts.get(id)
    if (!prompt) throw new Error(`Unknown prompt "${id}"`)
    return prompt
  }

  render(id: string, values: Record<string, unknown>): RenderedPrompt {
    const prompt = this.get(id)
    return {
      promptId: `${prompt.id}@v${prompt.version}`,
      model: this.modelOverrides[id] ?? prompt.model,
      ...(prompt.temperature === undefined
        ? {}
        : { temperature: prompt.temperature }),
      maxTokens: prompt.maxTokens,
      system: fill(prompt.system, values),
      user: fill(prompt.user, values),
    }
  }

  ids() {
    return [...this.prompts.keys()]
  }
}

import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { PromptLibrary, fill, parsePrompt } from './index.js'

const file = (
  front: string,
  body = '# System\nBe brief.\n\n# User\nBrand: {{brand}}',
) => `---\n${front}\n---\n${body}\n`

describe('parsePrompt', () => {
  it('reads the front matter and both sections', () => {
    const prompt = parsePrompt(
      file('id: test\nversion: 2\nmodel: some/model\ntemperature: 0.4'),
    )
    expect(prompt).toEqual({
      id: 'test',
      version: 2,
      model: 'some/model',
      temperature: 0.4,
      maxTokens: 8000,
      system: 'Be brief.',
      user: 'Brand: {{brand}}',
    })
  })

  it('leaves out the temperature when the file has none', () => {
    const prompt = parsePrompt(
      file('id: test\nversion: 1\nmodel: m  # a comment\nmaxTokens: 500'),
    )
    expect(prompt).not.toHaveProperty('temperature')
    expect(prompt).toMatchObject({ model: 'm', maxTokens: 500 })
  })

  it.each([
    ['no front matter', '# System\nx\n# User\ny', 'missing front matter'],
    ['no model', file('id: t\nversion: 1'), 'needs "model"'],
    ['bad version', file('id: t\nversion: one\nmodel: m'), 'version'],
    [
      'no user section',
      file('id: t\nversion: 1\nmodel: m', '# System\nx'),
      'section',
    ],
  ])('rejects a file with %s', (_, text, message) => {
    expect(() => parsePrompt(text, 'bad.md')).toThrow(message)
  })
})

describe('fill', () => {
  it('inserts strings as they are and objects as JSON', () => {
    expect(fill('{{a}} / {{ b }}', { a: 'x', b: { c: 1 } })).toBe(
      'x / {\n  "c": 1\n}',
    )
  })

  it('fails on a placeholder without a value', () => {
    expect(() => fill('{{missing}}', {})).toThrow('Missing prompt value')
  })
})

describe('PromptLibrary', () => {
  const dir = mkdtempSync(join(tmpdir(), 'prompts-'))
  writeFileSync(
    join(dir, 'brand.md'),
    file('id: brand\nversion: 3\nmodel: default/model'),
  )

  it('renders a prompt with its id and version', () => {
    const rendered = PromptLibrary.load({}, dir).render('brand', {
      brand: 'GymBeam',
    })
    expect(rendered).toMatchObject({
      promptId: 'brand@v3',
      model: 'default/model',
      user: 'Brand: GymBeam',
    })
  })

  it('takes the model from MODEL_<ID> when it is set', () => {
    const library = PromptLibrary.load({ MODEL_BRAND: 'other/model' }, dir)
    expect(library.render('brand', { brand: 'x' }).model).toBe('other/model')
  })

  it('loads the prompts that ship with the package', () => {
    const library = PromptLibrary.load()
    expect(library.ids().sort()).toEqual([
      'analysis',
      'background',
      'copy',
      'plan',
    ])
  })
})

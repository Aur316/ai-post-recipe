import { AnalysisOutput, PlanOutput } from '@ai-post-recipe/shared'
import { describe, expect, it } from 'vitest'

import { toStructuredSchema } from './json-schema.js'

describe('toStructuredSchema', () => {
  it('keeps fields whose names are also keywords', () => {
    const post = (
      toStructuredSchema(PlanOutput) as {
        properties: {
          posts: {
            items: { properties: Record<string, { enum?: Array<string> }> }
          }
        }
      }
    ).properties.posts.items.properties

    expect(post.format?.enum).toEqual(['IMAGE', 'CAROUSEL', 'STORY'])
  })

  it('closes every object and drops keywords providers reject', () => {
    const json = JSON.stringify(toStructuredSchema(PlanOutput))

    expect(json).not.toMatch(/minItems|maxItems|pattern|"\$schema"/)
    const schema = toStructuredSchema(AnalysisOutput) as {
      additionalProperties: boolean
      required: Array<string>
    }
    expect(schema.additionalProperties).toBe(false)
    expect(schema.required).toContain('claims')
  })
})

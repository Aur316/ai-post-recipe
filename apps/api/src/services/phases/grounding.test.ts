import type { PostCopy } from '@ai-post-recipe/shared'
import { describe, expect, it } from 'vitest'

import { findUnsupportedFacts } from './grounding.js'

const post = (
  caption: string,
  slides: Array<string> = ['Slide'],
): PostCopy => ({
  index: 1,
  caption,
  hashtags: [],
  slides: slides.map((text, i) => ({ order: i + 1, text })),
})

const SOURCE =
  'U dozi od 30 g sadrži najmanje 22 g bjelančevina i 6,5 g BCAA. Cijena 26,95 EUR. Preko 1.000 recenzija. Kažu: Najbolji protein koji sam probao.'

describe('findUnsupportedFacts', () => {
  it('accepts numbers that a source contains, in any decimal or thousands style', () => {
    expect(
      findUnsupportedFacts(
        [
          post('22 g proteina i 6.5 g BCAA za 26,95 € — 1000 recenzija', [
            '30 g',
          ]),
        ],
        [SOURCE],
      ),
    ).toEqual([])
  })

  it('lists a number that no source contains, with where it is', () => {
    expect(
      findUnsupportedFacts(
        [post('Sada 40% popusta!', ['Samo 19,99 EUR'])],
        [SOURCE],
      ),
    ).toEqual([
      {
        postIndex: 1,
        place: 'caption',
        kind: 'number',
        value: '40',
        context: 'Sada 40% popusta!',
      },
      {
        postIndex: 1,
        place: 1,
        kind: 'number',
        value: '19,99',
        context: 'Samo 19,99 EUR',
      },
    ])
  })

  it('ignores single digits such as list numbers', () => {
    expect(
      findUnsupportedFacts([post('3 savjeta za trening')], [SOURCE]),
    ).toEqual([])
  })

  it('accepts a quote taken word for word, and lists an invented one', () => {
    expect(
      findUnsupportedFacts(
        [post('„Najbolji protein koji sam probao.“')],
        [SOURCE],
      ),
    ).toEqual([])
    const [fact] = findUnsupportedFacts(
      [post('Trener kaže: "Ovo je moj tajni recept za snagu"')],
      [SOURCE],
    )
    expect(fact).toMatchObject({
      kind: 'quote',
      value: 'Ovo je moj tajni recept za snagu',
    })
  })
})

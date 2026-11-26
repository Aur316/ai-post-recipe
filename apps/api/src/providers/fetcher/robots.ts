interface Rule {
  allow: boolean
  pattern: RegExp
  length: number
}

/** robots.txt path pattern: `*` matches anything, `$` anchors the end. */
const toRegExp = (path: string) =>
  new RegExp(
    '^' +
      path
        .replace(/[.+?^{}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\\\$$|\$$/, '$'),
  )

/**
 * The rules of a robots.txt that apply to `agent`: its own group when there is
 * one, else the `*` group. The longest matching rule wins; Allow wins a tie.
 */
export function parseRobots(text: string, agent: string) {
  const groups: Array<{ agents: Array<string>; rules: Array<Rule> }> = []
  let current: (typeof groups)[number] | undefined
  let lastWasAgent = false

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim()
    const match = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line)
    if (!match) continue
    const key = (match[1] ?? '').toLowerCase()
    const value = (match[2] ?? '').trim()

    if (key === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] }
        groups.push(current)
      }
      current.agents.push(value.toLowerCase())
      lastWasAgent = true
      continue
    }
    lastWasAgent = false
    if (!current || (key !== 'allow' && key !== 'disallow')) continue
    // An empty Disallow allows everything.
    if (!value) continue
    current.rules.push({
      allow: key === 'allow',
      pattern: toRegExp(value),
      length: value.length,
    })
  }

  const name = agent.toLowerCase()
  const group =
    groups.find((g) => g.agents.some((a) => a !== '*' && name.includes(a))) ??
    groups.find((g) => g.agents.includes('*'))
  const rules = group?.rules ?? []

  return (path: string) => {
    let best: Rule | undefined
    for (const rule of rules) {
      if (!rule.pattern.test(path)) continue
      if (
        !best ||
        rule.length > best.length ||
        (rule.length === best.length && rule.allow)
      ) {
        best = rule
      }
    }
    return best?.allow ?? true
  }
}

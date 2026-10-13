import { expect, test } from 'claude-code/testing'

test('footer shows the current-session limit, no weekly', async ($, on) => {
  on('session.measure', ($, e) => ({ changed: e.changed }))
  on('clock.now', () => ({ value: Date.parse('2026-10-13T12:00:00Z') }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.id', () => ({ value: 'sid' }))
  on('env.get', () => ({ value: undefined }))
  on('fs.list', () => ({ value: [] }))
  on('ui.render', { component: 'SessionMode' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return h(Text, {}, e.props.modes.join(' & '))
  })
  await $.session.measure({
    context: { tokens: 45000, window: 1000000, percent: 4 },
    rateLimits: [
      { kind: 'five_hour', percentUsed: 81, resetsAt: '2026-10-13T13:27:00Z' },
      { kind: 'seven_day', percentUsed: 36 },
    ],
    changed: ['context', 'rateLimits'],
  })
  const tree = await $.ui.render({ surface: 'terminal', component: 'SessionMode', requestId: 'm', props: { modes: ['focus'] } })
  const text = JSON.stringify(tree)
  expect(text).toContain('focus & claude-opus-5-5 · 45,000 / 1,000,000 ctx (5%) · current session ████░ 81% reset in 1h27m')
  expect(text).not.toContain('36%')
})

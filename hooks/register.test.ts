import { expect, test } from 'claude-code/testing'
import { limit, num, until } from './register'

const now = Date.parse('2026-10-13T12:00:00Z')
test('formats', () => {
  expect(num(1000000)).toBe('1,000,000')
  expect(until('2026-10-13T14:14:00Z', now)).toBe('2h14m')
  expect(until('2026-10-15T15:00:00Z', now)).toBe('2d3h')
  expect(limit({ kind: 'five_hour', percentUsed: 41.5, resetsAt: '2026-10-13T12:30:00Z' }, now)).toBe('current session ██░░░ 42% reset in 30m')
})

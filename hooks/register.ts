import { atom, read, update } from 'claude-code'
import type { EngineInterface as Engine, Register, SessionMeasureInput, SessionRateLimit } from 'claude-code'

const line = atom({ plugin: 'session-status', key: 'line' } as const, '')
let last: SessionMeasureInput | undefined

export function num(n: number) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function until(iso: string, now: number) {
  const m = Math.max(0, Math.round((Date.parse(iso) - now) / 60000))
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60)
  return d ? `${d}d${h}h` : h ? `${h}h${m % 60}m` : `${m}m`
}

export function limit(r: SessionRateLimit, now: number) {
  const filled = Math.round((Math.min(r.percentUsed, 100) / 100) * 5)
  const reset = r.resetsAt ? ` reset in ${until(r.resetsAt, now)}` : ''
  return `current session ${'█'.repeat(filled)}${'░'.repeat(5 - filled)} ${Math.round(r.percentUsed)}%${reset}`
}

// Claude Code registers each running session in ~/.claude/sessions/<pid>.json; the name is what SendMessage uses.
// The plugin lives under ~/.claude (plugins/cache or a mods folder), so that dir is found from its root.
async function sessionName($: Engine) {
  const at = $.plugin.root.search(/[\\/]\.claude[\\/]/) // Windows paths use backslashes
  if (at < 0) return
  const dir = `${$.plugin.root.slice(0, at + 8)}/sessions`
  const sid = await $.session.id()
  for (const f of await $.fs.list(dir).catch(() => [])) {
    if (!f.name.endsWith('.json')) continue
    const s = await $.fs.read(`${dir}/${f.name}`).then(t => JSON.parse(t)).catch(() => null)
    if (s?.sessionId === sid) return s.name as string
  }
}

async function draw($: Engine) {
  if (!last) return
  const [model, now, maxEnv, name] = await Promise.all([
    $.session.model(), $.clock.now(), $.env.get('CLAUDE_CODE_MAX_CONTEXT_TOKENS'), sessionName($),
  ])
  // `ai` (~/.local/bin/ai.sh) sets the local model's real window; otherwise the engine's.
  const max = Number(maxEnv) || last.context.window
  const used = last.context.tokens ?? 0
  const text = [
    model,
    `${num(used)} / ${num(max)} ctx (${Math.round((used * 100) / max)}%)`,
    ...last.rateLimits.filter(r => r.kind === 'five_hour').map(r => limit(r, now)),
    name,
  ].filter(Boolean).join(' · ')
  await update($, line, () => text)
}

// session.measure only fires after a turn: measure at startup (nothing sent yet, e.g. a local model) and after a compaction.
async function remeasure($: Engine, tokens?: number) {
  const u = await $.session.usage({ breakdown: 'summary' }).catch(() => undefined)
  if (!u) return
  last = { ...u, changed: ['context'], context: { ...u.context, tokens: tokens ?? u.context.breakdown?.totalTokens ?? u.context.tokens } }
  await draw($)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    $.clock.every(60_000, () => draw($)) // keeps the reset countdown fresh between turns
    await remeasure($)
    return r
  })

  on('session.compact', async ($, e, next) => {
    const r = await next(e)
    // precompute only prepares a summary; a subagent's compaction isn't the main context
    if (e.trigger !== 'precompute' && !e.agentId && r.skip === undefined) await remeasure($, r.tokensAfter)
    return r
  })

  on('session.measure', async ($, e, next) => {
    last = e
    await draw($)
    return next(e)
  })

  // The footer's right-hand labels (`focus`, ...): the line sits at the end of the row.
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const text = await read($, line)
    return next(text ? { ...e, props: { ...e.props, modes: [...e.props.modes, text] } } : e)
  })
}

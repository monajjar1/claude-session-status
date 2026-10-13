declare module 'claude-code' {
  interface PluginState {
    'session-status': { line: string }
  }
}
export type Line = string

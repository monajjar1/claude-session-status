# session-status

A Claude Code mod that adds a live usage line to the right end of the prompt footer:

```
claude-opus-5-5 · 45,000 / 1,000,000 ctx (5%) · current session ████░ 81% reset in 1h27m · my-session
```

- **Model** and **context fill** for the current window
- **Current session** usage limit (5-hour window) with time until reset. Only shown on a Claude subscription.
- **Session name**: the name other sessions use to message this one

It updates after every turn, whenever the usage limit moves a point, and once a minute so the countdown stays current. Works on Linux, macOS and Windows.

## Install

At the prompt in a Claude Code terminal session:

```
/plugin install session-status --marketplace monajjar1/claude-session-status
```

Answer `y` to add the marketplace, then press Enter to install at user scope. It's active right away.

## Local models

If `CLAUDE_CODE_MAX_CONTEXT_TOKENS` is set (for example, when pointing Claude Code at LM Studio or llama.cpp), that value is used as the context window size.

## Develop

```
claude --plugin-dir .           # run a session with this folder loaded
claude plugin validate .
claude plugin test .
```

## License

MIT

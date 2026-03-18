# claude-helper (`ch`)

A reusable CLI for Claude Code hooks. Configure lint, format, typecheck, tool blocking, and session activity logging per-project via a `.claude/ch.local.json` config file.

## How It Works

Claude Code triggers hooks at specific lifecycle points (session start, before/after tool use). Each hook pipes a JSON payload to `ch` via stdin. `ch` loads the nearest `.claude/ch.local.json` config, processes the payload, and communicates back via exit codes:

- **Exit 0** — success (check passed, command allowed)
- **Exit 1** — check failure (`post-file-change` lint/format/typecheck errors)
- **Exit 2** — blocked (`tool-block` rejected the command)

If no `.claude/ch.local.json` is found, `ch` falls back to defaults (no checks, no tool blocks, extensions: `ts`, `tsx`, `js`, `jsx`).

## Setup

```bash
git clone <repo-url> && cd claude-helper
pnpm install
pnpm build
pnpm link --global

# or build and link in one command
pnpm link-local
```

## Config

Run `ch init` to scaffold `.claude/ch.local.json` with sensible defaults, or create it manually:

```json
{
  "checks": {
    "lint": "pnpm exec eslint --max-warnings=0 {{filePath}}",
    "format": "pnpm exec prettier --write {{filePath}}",
    "typeCheck": "pnpm typecheck"
  },
  "stopChecks": {
    "format": "pnpm exec prettier --write .",
    "lint": "pnpm exec eslint --max-warnings=0 .",
    "typeCheck": "pnpm typecheck",
    "test": "pnpm test:run"
  },
  "extensions": ["ts", "tsx", "js", "jsx"],
  "toolBlocks": [
    { "tool": "git push", "message": "do not push" },
    { "tool": "npm", "message": "do not use npm, use pnpm" }
  ]
}
```

- `{{filePath}}` is replaced with the actual file path at runtime
- `extensions` controls which file types trigger checks
- `stopChecks` defines project-wide checks to run when Claude stops (no `{{filePath}}` substitution)
- `toolBlocks` defines commands to block in PreToolUse hooks — matching is boundary-aware, so `"git push"` also catches `git push` inside chained commands like `pnpm build && git push`
- Checks named `format` run before other checks (so formatting happens before linting)
- Config is resolved by walking up from cwd, so monorepo sub-packages can have their own config

## Claude Code Integration

Add to your project's `.claude/settings.local.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [{ "type": "command", "command": "ch log-session-start" }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|MultiEdit|Write",
        "hooks": [{ "type": "command", "command": "ch post-file-change" }]
      },
      {
        "matcher": "Edit|MultiEdit|Write|Bash",
        "hooks": [{ "type": "command", "command": "ch log-action" }]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "ch tool-block" }]
      }
    ],
    "Stop": [
      {
        "hooks": [{ "type": "command", "command": "ch stop" }]
      }
    ]
  }
}
```

## Commands

### `ch init`

Scaffold `.claude/ch.local.json` with sensible defaults.

### `ch post-file-change`

Run configured checks (format, lint, typecheck) after a file change.

```bash
echo '{"tool_input":{"file_path":"src/app.ts"}}' | ch post-file-change
```

### `ch tool-block`

Block specific tools/commands in PreToolUse hooks.

```bash
echo '{"tool_input":{"command":"npm install foo"}}' | ch tool-block
# BLOCKED: do not use npm, use pnpm

echo '{"tool_input":{"command":"git push --force"}}' | ch tool-block
# BLOCKED: do not push
```

### `ch stop`

Run project-wide checks (format, lint, typecheck, test) configured in `stopChecks`. Intended as a `Stop` hook — runs when Claude finishes working.

```bash
ch stop
```

### `ch log-session-start`

Start a new session log. Intended as a `SessionStart` hook. Reads `session_id` from stdin and creates `.claude/ch-logs/<session_id>.log`. The log directory is auto-created on first use.

### `ch log-action`

Log a tool action to the current session log. Intended as a `PostToolUse` hook. Records file edits, file creates, and bash commands as a plain-text timeline.

```bash
echo '{"tool_name":"Edit","tool_input":{"file_path":"src/app.ts"}}' | ch log-action
# Appends: 14:03 — Edited src/app.ts
```

Example session log output:

```
--- Session started 2026-03-05 14:30:45 ---
14:30 — Edited src/config.ts
14:31 — Created src/log.ts
14:31 — Ran: pnpm build
14:32 — Edited src/cli.ts
```

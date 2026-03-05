# claude-helper (`ch`)

A reusable CLI for Claude Code hooks. Configure lint, format, typecheck, tool blocking, and session activity logging per-project via a `.claude/ch.local.json` config file.

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
  "extensions": ["ts", "tsx", "js", "jsx"],
  "toolBlocks": [
    { "tool": "git push", "message": "do not push without explicit permission" },
    { "tool": "npm", "message": "do not use npm, use pnpm" }
  ]
}
```

- `{{filePath}}` is replaced with the actual file path at runtime
- `extensions` controls which file types trigger checks
- `toolBlocks` defines commands to block in PreToolUse hooks
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
# BLOCKED: do not push without explicit permission
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

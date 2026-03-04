# claude-helper (`ch`)

A reusable CLI for Claude Code hooks. Configure lint, format, typecheck, and tool blocking per-project via a single `.ch.json` config file.

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

Create `.ch.json` in your project root (or run `ch init`):

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

## Claude Code Integration

Add to your project's `.claude/settings.local.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|MultiEdit|Write",
        "hooks": [{ "type": "command", "command": "ch post-file-change" }]
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

Scaffold a `.ch.json` config file with sensible defaults.

### `ch post-file-change`

Run configured checks after a file change.

```bash
# Via Claude hook (reads file_path from stdin JSON)
echo '{"tool_input":{"file_path":"src/app.ts"}}' | ch post-file-change

# Manual mode
ch post-file-change --file src/app.ts

# Selective checks
ch post-file-change --file src/app.ts --lint
ch post-file-change --file src/app.ts --format
ch post-file-change --file src/app.ts --type-check
```

### `ch tool-block`

Block specific tools/commands in PreToolUse hooks.

```bash
echo '{"tool_input":{"command":"npm install foo"}}' | ch tool-block
# BLOCKED: do not use npm, use pnpm

echo '{"tool_input":{"command":"git push --force"}}' | ch tool-block
# BLOCKED: do not push without explicit permission
```

# CLAUDE.md
## What This Is

`claude-helper` (`ch`) is a reusable CLI for Claude Code hooks. It runs lint, format, typecheck, tool-blocking checks, and session activity logging per-project via a `.claude/ch.local.json` config file. The CLI binary is `ch`.

## Commands

- `pnpm build`
- `pnpm dev` — run CLI via tsx
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:run` — vitest run, accepts file path

## Architecture

All source is in `src/`. Entry point is `src/cli.ts` (Commander-based).

**Config** (`src/config.ts`): Loads `.claude/ch.local.json` by walking up from cwd. Config schema: `{ checks, extensions, toolBlocks }`. Also exports `getClaudeDir()`.

**Stdin** (`src/stdin.ts`): Reads piped JSON from Claude Code hooks (the `tool_input` payload).

**Logging** (`src/log.ts`): Session activity logging utilities. Logs live in `.claude/ch-logs/`, one file per session (`<session_id>.log`).

**Commands** (`src/commands/`): File for each command.

# CLAUDE.md
## What This Is

`claude-helper` (`ch`) is a reusable CLI for Claude Code hooks. It runs lint, format, typecheck, and tool-blocking checks per-project via a `.ch.json` config file. The CLI binary is `ch`.

## Commands

- `pnpm build`
- `pnpm dev` — run CLI via tsx
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:run` — vitest run, accepts file path

## Architecture

All source is in `src/`. Entry point is `src/cli.ts` (Commander-based).

**Config** (`src/config.ts`): Loads `.ch.json` by walking up from cwd. Config schema: `{ checks, extensions, toolBlocks }`.

**Stdin** (`src/stdin.ts`): Reads piped JSON from Claude Code hooks (the `tool_input` payload).

**Commands** (`src/commands/`): File for each command.

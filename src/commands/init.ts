import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_CONFIG = {
  checks: {
    lint: "pnpm exec eslint --max-warnings=0 {{filePath}}",
    format: "pnpm exec prettier --write {{filePath}}",
    typeCheck: "pnpm typecheck",
  },
  extensions: ["ts", "tsx", "js", "jsx"],
  toolBlocks: [{ tool: "git push", message: "do not push" }],
};

export function init(): void {
  const claudeDir = join(process.cwd(), ".claude");
  const configPath = join(claudeDir, "ch.local.json");

  if (existsSync(configPath)) {
    console.warn(".claude/ch.local.json already exists. Skipping.");
    return;
  }

  mkdirSync(claudeDir, { recursive: true });
  writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n");
  console.log("Created .claude/ch.local.json with default config.");
}

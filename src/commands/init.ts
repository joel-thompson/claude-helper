import { writeFileSync, existsSync } from "node:fs";
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
  const configPath = join(process.cwd(), ".ch.json");

  if (existsSync(configPath)) {
    console.warn(".ch.json already exists. Skipping.");
    return;
  }

  writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n");
  console.log("Created .ch.json with default config.");
}

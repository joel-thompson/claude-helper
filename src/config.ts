import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";

interface ToolBlock {
  tool: string;
  message: string;
}

export interface ChConfig {
  checks: Record<string, string>;
  extensions: string[];
  toolBlocks: ToolBlock[];
}

const DEFAULT_CONFIG: ChConfig = {
  checks: {},
  extensions: ["ts", "tsx", "js", "jsx"],
  toolBlocks: [],
};

function findConfigFile(startDir: string): string | null {
  let dir = startDir;
  while (true) {
    const configPath = join(dir, ".ch.json");
    if (existsSync(configPath)) {
      return configPath;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export function loadConfig(cwd: string = process.cwd()): ChConfig {
  const configPath = findConfigFile(cwd);
  if (!configPath) {
    return DEFAULT_CONFIG;
  }

  const raw = JSON.parse(readFileSync(configPath, "utf-8"));
  return {
    checks: raw.checks ?? DEFAULT_CONFIG.checks,
    extensions: raw.extensions ?? DEFAULT_CONFIG.extensions,
    toolBlocks: raw.toolBlocks ?? DEFAULT_CONFIG.toolBlocks,
  };
}

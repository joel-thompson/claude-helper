import { execSync } from "node:child_process";
import { loadConfig } from "../config.js";

export async function stop(): Promise<void> {
  const config = loadConfig();

  const errors: string[] = [];

  const entries = Object.entries(config.stopChecks);
  const formatters = entries.filter(([key]) => key === "format");
  const others = entries.filter(([key]) => key !== "format");

  for (const [name, command] of [...formatters, ...others]) {
    try {
      execSync(command, { stdio: "pipe", encoding: "utf-8" });
    } catch (err) {
      const execErr = err as { stdout?: string; stderr?: string };
      const message =
        [execErr.stdout, execErr.stderr].filter(Boolean).join("\n").trim() ||
        String(err);
      errors.push(`[${name}] ${message}`);
    }
  }

  if (errors.length > 0) {
    console.error("Checks failed:\n");
    for (const error of errors) {
      console.error(error);
    }
    process.exit(1);
  }
}

import { execSync } from "node:child_process";
import { loadConfig } from "../config.js";

export function stop(): void {
  const config = loadConfig();

  const errors: string[] = [];

  const entries = Object.entries(config.stopChecks);
  const formatters = entries.filter(([key]) => key === "format");
  const others = entries.filter(([key]) => key !== "format");

  for (const [name, command] of [...formatters, ...others]) {
    try {
      execSync(command, { stdio: "pipe", encoding: "utf-8" });
    } catch (err) {
      const execErr = err as Error & {
        stdout?: string;
        stderr?: string;
        status?: number;
      };
      const output = [execErr.stdout, execErr.stderr]
        .filter(Boolean)
        .join("\n")
        .trim();
      const message =
        output ||
        (execErr.status != null ? `exit code ${execErr.status}` : String(err));
      errors.push(`[${name}] ${message}`);
    }
  }

  if (errors.length > 0) {
    const reason = ["Checks failed:", "", ...errors].join("\n");
    console.log(JSON.stringify({ decision: "block", reason }));
  }
}

import { execSync } from "node:child_process";
import { extname } from "node:path";
import { loadConfig } from "../config.js";
import { readStdin } from "../stdin.js";

function resolveFilePath(stdinData: string): string | null {
  try {
    const parsed = JSON.parse(stdinData);
    return parsed?.tool_input?.file_path ?? null;
  } catch {
    return null;
  }
}

function hasMatchingExtension(filePath: string, extensions: string[]): boolean {
  const ext = extname(filePath).replace(/^\./, "");
  return extensions.includes(ext);
}

export async function postFileChange(): Promise<void> {
  const config = loadConfig();
  const stdinData = await readStdin();
  const filePath = resolveFilePath(stdinData);

  if (!filePath) {
    console.error("No file path provided via stdin.");
    process.exit(1);
  }

  if (!hasMatchingExtension(filePath, config.extensions)) {
    return;
  }

  const errors: string[] = [];

  const entries = Object.entries(config.checks);
  const formatters = entries.filter(([key]) => key === "format");
  const others = entries.filter(([key]) => key !== "format");

  for (const [name, command] of [...formatters, ...others]) {
    const quoted = `'${filePath.replace(/'/g, "'\\''")}'`;
    const resolved = command.replaceAll("{{filePath}}", quoted);
    try {
      execSync(resolved, { stdio: "pipe", encoding: "utf-8" });
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
    console.error("Checks failed:\n");
    for (const error of errors) {
      console.error(error);
    }
    process.exit(1);
  }
}

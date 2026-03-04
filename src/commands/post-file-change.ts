import { execSync } from "node:child_process";
import { extname } from "node:path";
import { loadConfig } from "../config.js";
import { readStdin } from "../stdin.js";

interface PostFileChangeOptions {
  file?: string;
  lint?: boolean;
  format?: boolean;
  typeCheck?: boolean;
}

function resolveFilePath(stdinData: string, options: PostFileChangeOptions): string | null {
  if (options.file) {
    return options.file;
  }

  if (stdinData) {
    try {
      const parsed = JSON.parse(stdinData);
      return parsed?.tool_input?.file_path ?? null;
    } catch {
      return null;
    }
  }

  return null;
}

function hasMatchingExtension(filePath: string, extensions: string[]): boolean {
  const ext = extname(filePath).replace(/^\./, "");
  return extensions.includes(ext);
}

function getSelectedChecks(
  allChecks: Record<string, string>,
  options: PostFileChangeOptions
): Record<string, string> {
  const hasFilter = options.lint || options.format || options.typeCheck;
  if (!hasFilter) return allChecks;

  const selected: Record<string, string> = {};
  if (options.lint && allChecks["lint"]) selected["lint"] = allChecks["lint"];
  if (options.format && allChecks["format"]) selected["format"] = allChecks["format"];
  if (options.typeCheck && allChecks["typeCheck"]) selected["typeCheck"] = allChecks["typeCheck"];
  return selected;
}

export async function postFileChange(options: PostFileChangeOptions): Promise<void> {
  const config = loadConfig();
  const stdinData = await readStdin();
  const filePath = resolveFilePath(stdinData, options);

  if (!filePath) {
    console.error("No file path provided. Use --file or pipe stdin.");
    process.exit(1);
  }

  if (!hasMatchingExtension(filePath, config.extensions)) {
    return;
  }

  const checks = getSelectedChecks(config.checks, options);
  const errors: string[] = [];

  for (const [name, command] of Object.entries(checks)) {
    const quoted = `'${filePath.replace(/'/g, "'\\''")}'`;
    const resolved = command.replaceAll("{{filePath}}", quoted);
    try {
      execSync(resolved, { stdio: "pipe", encoding: "utf-8" });
    } catch (err) {
      const execErr = err as { stdout?: string; stderr?: string };
      const message = [execErr.stdout, execErr.stderr].filter(Boolean).join("\n").trim()
        || String(err);
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

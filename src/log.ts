import { existsSync, mkdirSync, readFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { getClaudeDir } from "./config.js";

export function getLogsDir(cwd?: string): string {
  const claudeDir = getClaudeDir(cwd) ?? join(cwd ?? process.cwd(), ".claude");
  const logsDir = join(claudeDir, "ch-logs");
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
  }
  return logsDir;
}

export function getCurrentLogPath(cwd?: string): string | null {
  const logsDir = getLogsDir(cwd);
  const currentFile = join(logsDir, "current");
  if (!existsSync(currentFile)) {
    return null;
  }
  const logPath = readFileSync(currentFile, "utf-8").trim();
  return logPath || null;
}

export function appendLog(line: string, cwd?: string): void {
  try {
    const logPath = getCurrentLogPath(cwd);
    if (!logPath) return;
    appendFileSync(logPath, line + "\n");
  } catch {
    // Silent on errors
  }
}

export function formatTimestamp(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

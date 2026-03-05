import { existsSync, mkdirSync, appendFileSync } from "node:fs";
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

export function getLogFilePath(sessionId: string, cwd?: string): string {
  const logsDir = getLogsDir(cwd);
  return join(logsDir, `${sessionId}.log`);
}

export function appendLog(line: string, sessionId: string, cwd?: string): void {
  try {
    if (!sessionId) return;
    const logPath = getLogFilePath(sessionId, cwd);
    appendFileSync(logPath, line + "\n");
  } catch {
    // Silent on errors
  }
}

export function formatTimestamp(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

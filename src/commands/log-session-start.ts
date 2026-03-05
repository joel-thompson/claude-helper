import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { getLogsDir } from "../log.js";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function logSessionStart(): void {
  const logsDir = getLogsDir();
  const now = new Date();

  const datePart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timePart = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const fileTimestamp = `${datePart}_${timePart}`;
  const displayTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const logFile = join(logsDir, `${fileTimestamp}.log`);
  const currentFile = join(logsDir, "current");

  writeFileSync(currentFile, logFile);
  writeFileSync(
    logFile,
    `--- Session started ${datePart} ${displayTime} ---\n`,
  );
}

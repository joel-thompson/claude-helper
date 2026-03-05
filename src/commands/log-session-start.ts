import { writeFileSync } from "node:fs";
import { readStdin } from "../stdin.js";
import { getLogFilePath } from "../log.js";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export async function logSessionStart(): Promise<void> {
  const stdinData = await readStdin();
  if (!stdinData) return;

  let sessionId: string;
  try {
    const parsed = JSON.parse(stdinData);
    sessionId = parsed?.session_id;
  } catch {
    return;
  }
  if (!sessionId) return;

  const logFile = getLogFilePath(sessionId);
  const now = new Date();
  const datePart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const displayTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  writeFileSync(
    logFile,
    `--- Session started ${datePart} ${displayTime} ---\n`,
  );
}

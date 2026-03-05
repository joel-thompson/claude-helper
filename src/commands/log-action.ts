import { readStdin } from "../stdin.js";
import { appendLog, formatTimestamp } from "../log.js";

function formatAction(
  toolName: string,
  toolInput: Record<string, unknown>,
): string | null {
  const ts = formatTimestamp();
  switch (toolName) {
    case "Edit":
    case "MultiEdit":
      return `${ts} — Edited ${toolInput.file_path}`;
    case "Write":
      return `${ts} — Created ${toolInput.file_path}`;
    case "Bash":
      return `${ts} — Ran: ${toolInput.command}`;
    default:
      return null;
  }
}

export async function logAction(): Promise<void> {
  const stdinData = await readStdin();
  if (!stdinData) return;

  try {
    const parsed = JSON.parse(stdinData);
    const toolName = parsed?.tool_name;
    const toolInput = parsed?.tool_input;
    if (!toolName || !toolInput) return;

    const line = formatAction(toolName, toolInput);
    if (line) {
      appendLog(line);
    }
  } catch {
    // Silent on errors
  }
}

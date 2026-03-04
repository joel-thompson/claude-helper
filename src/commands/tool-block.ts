import { loadConfig } from "../config.js";
import { readStdin } from "../stdin.js";

export async function toolBlock(): Promise<void> {
  const config = loadConfig();
  const stdinData = await readStdin();

  if (!stdinData) {
    console.error("No stdin data provided.");
    process.exit(1);
  }

  let command: string;
  try {
    const parsed = JSON.parse(stdinData);
    command = parsed?.tool_input?.command;
  } catch {
    console.error("Failed to parse stdin JSON.");
    process.exit(1);
  }

  if (!command) {
    return;
  }

  for (const block of config.toolBlocks) {
    const escaped = block.tool.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(^|&&|\\|\\||\\||;)\\s*${escaped}(\\s|$)`);
    if (pattern.test(command)) {
      console.error(`BLOCKED: ${block.message}`);
      process.exit(2);
    }
  }
}

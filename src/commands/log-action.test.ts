import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  appendFileSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";

const TEST_DIR = join(import.meta.dirname, ".test-tmp-action");

vi.mock("../stdin.js", () => ({
  readStdin: vi.fn(),
}));

vi.mock("../log.js", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../log.js")>();
  return {
    ...orig,
    formatTimestamp: () => "14:03",
    getLogFilePath: (sessionId: string) => {
      return join(TEST_DIR, ".claude", "ch-logs", `${sessionId}.log`);
    },
    appendLog: (line: string, sessionId: string) => {
      try {
        const logPath = join(
          TEST_DIR,
          ".claude",
          "ch-logs",
          `${sessionId}.log`,
        );
        appendFileSync(logPath, line + "\n");
      } catch {
        // silent
      }
    },
  };
});

import { readStdin } from "../stdin.js";
import { logAction } from "./log-action.js";

const mockReadStdin = vi.mocked(readStdin);

function setupLogFile(sessionId: string): string {
  const logsDir = join(TEST_DIR, ".claude", "ch-logs");
  mkdirSync(logsDir, { recursive: true });
  const logFile = join(logsDir, `${sessionId}.log`);
  writeFileSync(logFile, "");
  return logFile;
}

describe("logAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    rmSync(TEST_DIR, { recursive: true, force: true });
  });
  afterEach(() => rmSync(TEST_DIR, { recursive: true, force: true }));

  it("formats Edit action correctly", async () => {
    const logFile = setupLogFile("sess-1");
    mockReadStdin.mockResolvedValue(
      JSON.stringify({
        session_id: "sess-1",
        tool_name: "Edit",
        tool_input: { file_path: "src/app.ts" },
      }),
    );

    await logAction();

    const content = readFileSync(logFile, "utf-8");
    expect(content).toContain("14:03 — Edited src/app.ts");
  });

  it("formats Write action correctly", async () => {
    const logFile = setupLogFile("sess-1");
    mockReadStdin.mockResolvedValue(
      JSON.stringify({
        session_id: "sess-1",
        tool_name: "Write",
        tool_input: { file_path: "src/new.ts" },
      }),
    );

    await logAction();

    const content = readFileSync(logFile, "utf-8");
    expect(content).toContain("14:03 — Created src/new.ts");
  });

  it("formats Bash action correctly", async () => {
    const logFile = setupLogFile("sess-1");
    mockReadStdin.mockResolvedValue(
      JSON.stringify({
        session_id: "sess-1",
        tool_name: "Bash",
        tool_input: { command: "npm test" },
      }),
    );

    await logAction();

    const content = readFileSync(logFile, "utf-8");
    expect(content).toContain("14:03 — Ran: npm test");
  });

  it("skips unknown tools silently", async () => {
    const logFile = setupLogFile("sess-1");
    mockReadStdin.mockResolvedValue(
      JSON.stringify({
        session_id: "sess-1",
        tool_name: "Read",
        tool_input: { file_path: "src/app.ts" },
      }),
    );

    await logAction();

    const content = readFileSync(logFile, "utf-8");
    expect(content).toBe("");
  });

  it("handles missing session_id gracefully", async () => {
    mockReadStdin.mockResolvedValue(
      JSON.stringify({
        tool_name: "Edit",
        tool_input: { file_path: "src/app.ts" },
      }),
    );

    await expect(logAction()).resolves.toBeUndefined();
  });

  it("handles empty stdin gracefully", async () => {
    mockReadStdin.mockResolvedValue("");
    await expect(logAction()).resolves.toBeUndefined();
  });
});

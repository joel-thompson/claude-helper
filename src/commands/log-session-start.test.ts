import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { existsSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR = join(import.meta.dirname, "../../.test-tmp-session");

vi.mock("../stdin.js", () => ({
  readStdin: vi.fn(),
}));

vi.mock("../log.js", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../log.js")>();
  return {
    ...orig,
    getLogsDir: () => {
      const dir = join(TEST_DIR, ".claude", "ch-logs");
      mkdirSync(dir, { recursive: true });
      return dir;
    },
    getLogFilePath: (sessionId: string) => {
      const dir = join(TEST_DIR, ".claude", "ch-logs");
      mkdirSync(dir, { recursive: true });
      return join(dir, `${sessionId}.log`);
    },
  };
});

import { readStdin } from "../stdin.js";
import { logSessionStart } from "./log-session-start.js";

const mockReadStdin = vi.mocked(readStdin);

describe("logSessionStart", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    rmSync(TEST_DIR, { recursive: true, force: true });
    mkdirSync(join(TEST_DIR, ".claude", "ch-logs"), { recursive: true });
  });
  afterEach(() => rmSync(TEST_DIR, { recursive: true, force: true }));

  it("creates a log file named by session_id", async () => {
    mockReadStdin.mockResolvedValue(JSON.stringify({ session_id: "sess-abc" }));

    await logSessionStart();

    const logsDir = join(TEST_DIR, ".claude", "ch-logs");
    const logFile = join(logsDir, "sess-abc.log");
    expect(existsSync(logFile)).toBe(true);
    expect(existsSync(join(logsDir, "current"))).toBe(false);
  });

  it("writes a session header to the log file", async () => {
    mockReadStdin.mockResolvedValue(JSON.stringify({ session_id: "sess-abc" }));

    await logSessionStart();

    const logFile = join(TEST_DIR, ".claude", "ch-logs", "sess-abc.log");
    const content = readFileSync(logFile, "utf-8");
    expect(content).toMatch(
      /^--- Session started \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} ---\n$/,
    );
  });

  it("does nothing when no session_id in stdin", async () => {
    mockReadStdin.mockResolvedValue(JSON.stringify({}));

    await logSessionStart();

    const logsDir = join(TEST_DIR, ".claude", "ch-logs");
    // No log files should be created
    const { readdirSync } = await import("node:fs");
    const files = readdirSync(logsDir);
    expect(files).toHaveLength(0);
  });

  it("does nothing when stdin is empty", async () => {
    mockReadStdin.mockResolvedValue("");
    await expect(logSessionStart()).resolves.toBeUndefined();
  });
});

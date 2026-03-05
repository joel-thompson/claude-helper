import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR = join(import.meta.dirname, "../../.test-tmp-session");

vi.mock("../log.js", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../log.js")>();
  return {
    ...orig,
    getLogsDir: () => {
      const dir = join(TEST_DIR, ".claude", "ch-logs");
      mkdirSync(dir, { recursive: true });
      return dir;
    },
  };
});

import { vi } from "vitest";
import { logSessionStart } from "./log-session-start.js";

describe("logSessionStart", () => {
  beforeEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    mkdirSync(join(TEST_DIR, ".claude", "ch-logs"), { recursive: true });
  });
  afterEach(() => rmSync(TEST_DIR, { recursive: true, force: true }));

  it("creates a log file and writes the current pointer", () => {
    logSessionStart();

    const logsDir = join(TEST_DIR, ".claude", "ch-logs");
    const currentFile = join(logsDir, "current");
    expect(existsSync(currentFile)).toBe(true);

    const logPath = readFileSync(currentFile, "utf-8");
    expect(logPath).toMatch(/\.log$/);
    expect(existsSync(logPath)).toBe(true);
  });

  it("writes a session header to the log file", () => {
    logSessionStart();

    const logsDir = join(TEST_DIR, ".claude", "ch-logs");
    const logPath = readFileSync(join(logsDir, "current"), "utf-8");
    const content = readFileSync(logPath, "utf-8");
    expect(content).toMatch(
      /^--- Session started \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} ---\n$/,
    );
  });
});

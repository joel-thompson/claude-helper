import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import {
  appendLog,
  getLogFilePath,
  getLogsDir,
  formatTimestamp,
} from "./log.js";

const TEST_DIR = join(import.meta.dirname, ".test-tmp-log");

function setup() {
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(join(TEST_DIR, ".claude", "ch-logs"), { recursive: true });
}

describe("getLogsDir", () => {
  beforeEach(setup);
  afterEach(() => rmSync(TEST_DIR, { recursive: true, force: true }));

  it("returns .claude/ch-logs/ path and creates dir if missing", () => {
    const dir = getLogsDir(TEST_DIR);
    expect(dir).toBe(join(TEST_DIR, ".claude", "ch-logs"));
    expect(existsSync(dir)).toBe(true);
  });
});

describe("getLogFilePath", () => {
  beforeEach(setup);
  afterEach(() => rmSync(TEST_DIR, { recursive: true, force: true }));

  it("returns <logsDir>/<sessionId>.log", () => {
    const path = getLogFilePath("abc-123", TEST_DIR);
    expect(path).toBe(join(TEST_DIR, ".claude", "ch-logs", "abc-123.log"));
  });
});

describe("appendLog", () => {
  beforeEach(setup);
  afterEach(() => rmSync(TEST_DIR, { recursive: true, force: true }));

  it("appends a line to the session log file", () => {
    const sessionId = "test-session";
    const logFile = getLogFilePath(sessionId, TEST_DIR);
    writeFileSync(logFile, "header\n");

    appendLog("first line", sessionId, TEST_DIR);
    appendLog("second line", sessionId, TEST_DIR);

    const content = readFileSync(logFile, "utf-8");
    expect(content).toBe("header\nfirst line\nsecond line\n");
  });

  it("silently does nothing when no sessionId", () => {
    expect(() => appendLog("line", "", TEST_DIR)).not.toThrow();
  });
});

describe("formatTimestamp", () => {
  it("returns HH:MM format", () => {
    const ts = formatTimestamp();
    expect(ts).toMatch(/^\d{2}:\d{2}$/);
  });
});

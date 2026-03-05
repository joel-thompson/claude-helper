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
  getCurrentLogPath,
  getLogsDir,
  formatTimestamp,
} from "./log.js";

const TEST_DIR = join(import.meta.dirname, "../.test-tmp-log");

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

describe("getCurrentLogPath", () => {
  beforeEach(setup);
  afterEach(() => rmSync(TEST_DIR, { recursive: true, force: true }));

  it("returns null when no current file exists", () => {
    expect(getCurrentLogPath(TEST_DIR)).toBeNull();
  });

  it("returns the path written in current file", () => {
    const logsDir = join(TEST_DIR, ".claude", "ch-logs");
    writeFileSync(join(logsDir, "current"), "/some/log.log");
    expect(getCurrentLogPath(TEST_DIR)).toBe("/some/log.log");
  });
});

describe("appendLog", () => {
  beforeEach(setup);
  afterEach(() => rmSync(TEST_DIR, { recursive: true, force: true }));

  it("appends a line to the current log file", () => {
    const logsDir = join(TEST_DIR, ".claude", "ch-logs");
    const logFile = join(logsDir, "test.log");
    writeFileSync(logFile, "header\n");
    writeFileSync(join(logsDir, "current"), logFile);

    appendLog("first line", TEST_DIR);
    appendLog("second line", TEST_DIR);

    const content = readFileSync(logFile, "utf-8");
    expect(content).toBe("header\nfirst line\nsecond line\n");
  });

  it("silently does nothing when no current session", () => {
    expect(() => appendLog("line", TEST_DIR)).not.toThrow();
  });
});

describe("formatTimestamp", () => {
  it("returns HH:MM format", () => {
    const ts = formatTimestamp();
    expect(ts).toMatch(/^\d{2}:\d{2}$/);
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { loadConfig, getClaudeDir } from "./config.js";

const TEST_DIR = join(import.meta.dirname, "../.test-tmp-config");

describe("loadConfig", () => {
  beforeEach(() => rmSync(TEST_DIR, { recursive: true, force: true }));
  afterEach(() => rmSync(TEST_DIR, { recursive: true, force: true }));

  it("returns default config when no config exists", () => {
    const config = loadConfig("/tmp/nonexistent-dir");
    expect(config.extensions).toEqual(["ts", "tsx", "js", "jsx"]);
    expect(config.checks).toEqual({});
    expect(config.toolBlocks).toEqual([]);
  });

  it("loads config from .claude/ch.local.json", () => {
    mkdirSync(join(TEST_DIR, ".claude"), { recursive: true });
    writeFileSync(
      join(TEST_DIR, ".claude", "ch.local.json"),
      JSON.stringify({ checks: { lint: "echo ok" }, extensions: ["ts"] }),
    );
    const config = loadConfig(TEST_DIR);
    expect(config.checks).toEqual({ lint: "echo ok" });
    expect(config.extensions).toEqual(["ts"]);
  });
});

describe("getClaudeDir", () => {
  beforeEach(() => rmSync(TEST_DIR, { recursive: true, force: true }));
  afterEach(() => rmSync(TEST_DIR, { recursive: true, force: true }));

  it("returns null when no .claude dir exists", () => {
    expect(getClaudeDir("/tmp/nonexistent-dir")).toBeNull();
  });

  it("finds .claude dir in start directory", () => {
    mkdirSync(join(TEST_DIR, ".claude"), { recursive: true });
    expect(getClaudeDir(TEST_DIR)).toBe(join(TEST_DIR, ".claude"));
  });
});

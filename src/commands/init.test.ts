import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR = join(import.meta.dirname, "../../.test-tmp-init");

describe("init", () => {
  let originalCwd: string;

  beforeEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    const { mkdirSync } = require("node:fs");
    mkdirSync(TEST_DIR, { recursive: true });
    originalCwd = process.cwd();
    process.chdir(TEST_DIR);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("creates .claude/ch.local.json with default config", async () => {
    const { init } = await import("./init.js");
    init();

    const configPath = join(TEST_DIR, ".claude", "ch.local.json");
    expect(existsSync(configPath)).toBe(true);

    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    expect(config.checks).toBeDefined();
    expect(config.extensions).toBeDefined();
    expect(config.toolBlocks).toBeDefined();
  });

  it("creates .claude/ch-logs/ directory", async () => {
    const { init } = await import("./init.js");
    init();

    expect(existsSync(join(TEST_DIR, ".claude", "ch-logs"))).toBe(true);
  });

  it("skips if config already exists", async () => {
    const { init } = await import("./init.js");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    init();
    init();

    expect(warnSpy).toHaveBeenCalledWith(
      ".claude/ch.local.json already exists. Skipping.",
    );
    warnSpy.mockRestore();
  });
});

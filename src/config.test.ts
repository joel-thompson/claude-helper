import { describe, it, expect } from "vitest";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  it("returns default config when no .ch.json exists", () => {
    const config = loadConfig("/tmp/nonexistent-dir");
    expect(config.extensions).toEqual(["ts", "tsx", "js", "jsx"]);
    expect(config.checks).toEqual({});
    expect(config.toolBlocks).toEqual([]);
  });
});

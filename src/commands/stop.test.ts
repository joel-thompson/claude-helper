import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ChConfig } from "../config.js";

vi.mock("../config.js", () => ({
  loadConfig: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

import { loadConfig } from "../config.js";
import { execSync } from "node:child_process";
import { stop } from "./stop.js";

const mockLoadConfig = vi.mocked(loadConfig);
const mockExecSync = vi.mocked(execSync);

function makeConfig(overrides: Partial<ChConfig> = {}): ChConfig {
  return {
    extensions: ["ts"],
    checks: {},
    stopChecks: {},
    toolBlocks: [],
    ...overrides,
  };
}

describe("stop", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetAllMocks();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    mockLoadConfig.mockReturnValue(makeConfig());
  });

  it("does nothing when stopChecks is empty", async () => {
    await stop();

    expect(mockExecSync).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("succeeds when all checks pass", async () => {
    mockLoadConfig.mockReturnValue(
      makeConfig({ stopChecks: { lint: "eslint .", typeCheck: "tsc" } }),
    );

    await stop();

    expect(logSpy).not.toHaveBeenCalled();
    expect(mockExecSync).toHaveBeenCalledTimes(2);
  });

  it("runs commands without filePath substitution", async () => {
    mockLoadConfig.mockReturnValue(
      makeConfig({ stopChecks: { lint: "eslint ." } }),
    );

    await stop();

    expect(mockExecSync).toHaveBeenCalledWith("eslint .", {
      stdio: "pipe",
      encoding: "utf-8",
    });
  });

  it("outputs block decision JSON when a check fails", async () => {
    mockLoadConfig.mockReturnValue(
      makeConfig({ stopChecks: { lint: "eslint ." } }),
    );
    mockExecSync.mockImplementation(() => {
      throw { stdout: "lint error", stderr: "details" };
    });

    await stop();

    const output = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(output.decision).toBe("block");
    expect(output.reason).toContain("Checks failed:");
    expect(output.reason).toContain("[lint] lint error\ndetails");
  });

  it("runs format checks before other checks", async () => {
    mockLoadConfig.mockReturnValue(
      makeConfig({
        stopChecks: {
          lint: "eslint .",
          format: "prettier --write .",
          typeCheck: "tsc",
        },
      }),
    );

    const callOrder: string[] = [];
    mockExecSync.mockImplementation((cmd) => {
      callOrder.push(String(cmd));
      return "";
    });

    await stop();

    expect(callOrder[0]).toContain("prettier");
    expect(callOrder.slice(1)).toEqual(
      expect.arrayContaining(["eslint .", "tsc"]),
    );
  });

  it("runs checks in source order when no format key exists", async () => {
    mockLoadConfig.mockReturnValue(
      makeConfig({
        stopChecks: {
          lint: "eslint .",
          typeCheck: "tsc",
        },
      }),
    );

    const callOrder: string[] = [];
    mockExecSync.mockImplementation((cmd) => {
      callOrder.push(String(cmd));
      return "";
    });

    await stop();

    expect(callOrder).toEqual(["eslint .", "tsc"]);
  });

  it("reports only the failing check when multiple checks run", async () => {
    mockLoadConfig.mockReturnValue(
      makeConfig({ stopChecks: { lint: "eslint .", typeCheck: "tsc" } }),
    );
    mockExecSync
      .mockImplementationOnce(() => "ok")
      .mockImplementationOnce(() => {
        throw { stdout: "type error", stderr: "" };
      });

    await stop();

    const output = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(output.reason).toContain("[typeCheck] type error");
    expect(output.reason).not.toContain("[lint]");
  });

  it("runs all checks and collects all errors before blocking", async () => {
    mockLoadConfig.mockReturnValue(
      makeConfig({ stopChecks: { lint: "eslint .", typeCheck: "tsc" } }),
    );
    mockExecSync
      .mockImplementationOnce(() => {
        throw { stdout: "lint fail", stderr: "" };
      })
      .mockImplementationOnce(() => {
        throw { stdout: "type fail", stderr: "" };
      });

    await stop();

    const output = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(output.decision).toBe("block");
    expect(output.reason).toContain("[lint] lint fail");
    expect(output.reason).toContain("[typeCheck] type fail");
  });
});

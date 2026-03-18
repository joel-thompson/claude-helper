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
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetAllMocks();
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockLoadConfig.mockReturnValue(makeConfig());
  });

  it("does nothing when stopChecks is empty", async () => {
    await stop();

    expect(mockExecSync).not.toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("succeeds when all checks pass", async () => {
    mockLoadConfig.mockReturnValue(
      makeConfig({ stopChecks: { lint: "eslint .", typeCheck: "tsc" } }),
    );

    await stop();

    expect(exitSpy).not.toHaveBeenCalled();
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

  it("exits with error output when a check fails", async () => {
    mockLoadConfig.mockReturnValue(
      makeConfig({ stopChecks: { lint: "eslint ." } }),
    );
    mockExecSync.mockImplementation(() => {
      throw { stdout: "lint error", stderr: "details" };
    });

    await expect(stop()).rejects.toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith("Checks failed:\n");
    expect(errorSpy).toHaveBeenCalledWith("[lint] lint error\ndetails");
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

    await expect(stop()).rejects.toThrow("process.exit");
    expect(errorSpy).toHaveBeenCalledWith("[typeCheck] type error");
    const errorCalls = errorSpy.mock.calls.flat();
    expect(errorCalls).not.toContainEqual(expect.stringContaining("[lint]"));
  });

  it("runs all checks and collects all errors before exiting", async () => {
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

    await expect(stop()).rejects.toThrow("process.exit");
    expect(errorSpy).toHaveBeenCalledWith("[lint] lint fail");
    expect(errorSpy).toHaveBeenCalledWith("[typeCheck] type fail");
  });
});

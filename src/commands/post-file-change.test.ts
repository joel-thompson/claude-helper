import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ChConfig } from "../config.js";

vi.mock("../config.js", () => ({
  loadConfig: vi.fn(),
}));

vi.mock("../stdin.js", () => ({
  readStdin: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

import { loadConfig } from "../config.js";
import { readStdin } from "../stdin.js";
import { execSync } from "node:child_process";
import { postFileChange } from "./post-file-change.js";

const mockLoadConfig = vi.mocked(loadConfig);
const mockReadStdin = vi.mocked(readStdin);
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

describe("postFileChange", () => {
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

  describe("resolveFilePath", () => {
    it("parses valid stdin JSON with file_path", async () => {
      mockReadStdin.mockResolvedValue(
        '{"tool_input":{"file_path":"src/app.ts"}}',
      );
      mockLoadConfig.mockReturnValue(
        makeConfig({ checks: { lint: "echo {{filePath}}" } }),
      );

      await postFileChange();

      expect(mockExecSync).toHaveBeenCalledOnce();
    });

    it("exits on malformed JSON", async () => {
      mockReadStdin.mockResolvedValue("not json");

      await expect(postFileChange()).rejects.toThrow("process.exit");
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errorSpy).toHaveBeenCalledWith("No file path provided via stdin.");
    });

    it("exits on empty stdin", async () => {
      mockReadStdin.mockResolvedValue("");

      await expect(postFileChange()).rejects.toThrow("process.exit");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("exits when file_path key is missing", async () => {
      mockReadStdin.mockResolvedValue('{"tool_input":{}}');

      await expect(postFileChange()).rejects.toThrow("process.exit");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("extension filtering", () => {
    it("runs checks for matching extension", async () => {
      mockReadStdin.mockResolvedValue(
        '{"tool_input":{"file_path":"src/app.ts"}}',
      );
      mockLoadConfig.mockReturnValue(
        makeConfig({ extensions: ["ts"], checks: { lint: "echo ok" } }),
      );

      await postFileChange();

      expect(mockExecSync).toHaveBeenCalledOnce();
    });

    it("skips checks for non-matching extension", async () => {
      mockReadStdin.mockResolvedValue(
        '{"tool_input":{"file_path":"src/app.css"}}',
      );
      mockLoadConfig.mockReturnValue(
        makeConfig({ extensions: ["ts"], checks: { lint: "echo ok" } }),
      );

      await postFileChange();

      expect(mockExecSync).not.toHaveBeenCalled();
    });
  });

  describe("check execution", () => {
    it("succeeds when all checks pass", async () => {
      mockReadStdin.mockResolvedValue(
        '{"tool_input":{"file_path":"src/app.ts"}}',
      );
      mockLoadConfig.mockReturnValue(
        makeConfig({ checks: { lint: "eslint", types: "tsc" } }),
      );

      await postFileChange();

      expect(exitSpy).not.toHaveBeenCalled();
      expect(mockExecSync).toHaveBeenCalledTimes(2);
    });

    it("exits with error output when a check fails", async () => {
      mockReadStdin.mockResolvedValue(
        '{"tool_input":{"file_path":"src/app.ts"}}',
      );
      mockLoadConfig.mockReturnValue(
        makeConfig({ checks: { lint: "eslint" } }),
      );
      mockExecSync.mockImplementation(() => {
        throw Object.assign(new Error("cmd failed"), {
          stdout: "lint error",
          stderr: "details",
        });
      });

      await expect(postFileChange()).rejects.toThrow("process.exit");
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errorSpy).toHaveBeenCalledWith("Checks failed:\n");
      expect(errorSpy).toHaveBeenCalledWith("[lint] lint error\ndetails");
    });

    it("substitutes {{filePath}} in commands", async () => {
      mockReadStdin.mockResolvedValue(
        '{"tool_input":{"file_path":"src/app.ts"}}',
      );
      mockLoadConfig.mockReturnValue(
        makeConfig({ checks: { lint: "eslint {{filePath}}" } }),
      );

      await postFileChange();

      expect(mockExecSync).toHaveBeenCalledWith("eslint 'src/app.ts'", {
        stdio: "pipe",
        encoding: "utf-8",
      });
    });

    it("runs format checks before other checks", async () => {
      mockReadStdin.mockResolvedValue(
        '{"tool_input":{"file_path":"src/app.ts"}}',
      );
      mockLoadConfig.mockReturnValue(
        makeConfig({
          checks: {
            lint: "eslint {{filePath}}",
            format: "prettier --write {{filePath}}",
            types: "tsc {{filePath}}",
          },
        }),
      );

      const callOrder: string[] = [];
      mockExecSync.mockImplementation((cmd) => {
        callOrder.push(String(cmd));
        return "";
      });

      await postFileChange();

      expect(callOrder[0]).toContain("prettier");
      expect(callOrder.slice(1)).toEqual(
        expect.arrayContaining(["eslint 'src/app.ts'", "tsc 'src/app.ts'"]),
      );
    });

    it("runs checks in source order when no format key exists", async () => {
      mockReadStdin.mockResolvedValue(
        '{"tool_input":{"file_path":"src/app.ts"}}',
      );
      mockLoadConfig.mockReturnValue(
        makeConfig({
          checks: {
            lint: "eslint {{filePath}}",
            types: "tsc {{filePath}}",
          },
        }),
      );

      const callOrder: string[] = [];
      mockExecSync.mockImplementation((cmd) => {
        callOrder.push(String(cmd));
        return "";
      });

      await postFileChange();

      expect(callOrder).toEqual(["eslint 'src/app.ts'", "tsc 'src/app.ts'"]);
    });

    it("reports only the failing check when multiple checks run", async () => {
      mockReadStdin.mockResolvedValue(
        '{"tool_input":{"file_path":"src/app.ts"}}',
      );
      mockLoadConfig.mockReturnValue(
        makeConfig({ checks: { lint: "eslint", types: "tsc" } }),
      );
      mockExecSync
        .mockImplementationOnce(() => "ok")
        .mockImplementationOnce(() => {
          throw Object.assign(new Error("cmd failed"), {
            stdout: "type error",
            stderr: "",
          });
        });

      await expect(postFileChange()).rejects.toThrow("process.exit");
      expect(errorSpy).toHaveBeenCalledWith("[types] type error");
      const errorCalls = errorSpy.mock.calls.flat();
      expect(errorCalls).not.toContainEqual(expect.stringContaining("[lint]"));
    });
  });
});

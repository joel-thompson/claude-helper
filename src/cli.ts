#!/usr/bin/env node

import { Command } from "commander";
import { postFileChange } from "./commands/post-file-change.js";
import { toolBlock } from "./commands/tool-block.js";
import { init } from "./commands/init.js";

const program = new Command();

program
  .name("ch")
  .description("Claude Helper — reusable CLI for Claude Code hooks")
  .version("1.0.0");

program
  .command("init")
  .description("Scaffold a .ch.json config file in the current directory")
  .action(() => {
    init();
  });

program
  .command("post-file-change")
  .description("Run configured checks after a file change")
  .option("--file <path>", "File path to check (alternative to stdin)")
  .option("--lint", "Run only the lint check")
  .option("--format", "Run only the format check")
  .option("--type-check", "Run only the typecheck")
  .action(async (options) => {
    await postFileChange(options);
  });

program
  .command("tool-block")
  .description("Check if a tool command should be blocked (PreToolUse hook)")
  .action(async () => {
    await toolBlock();
  });

program.parse();

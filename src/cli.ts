#!/usr/bin/env node

import { Command } from "commander";
import { postFileChange } from "./commands/post-file-change.js";
import { toolBlock } from "./commands/tool-block.js";
import { init } from "./commands/init.js";
import { logSessionStart } from "./commands/log-session-start.js";
import { logAction } from "./commands/log-action.js";
import { stop } from "./commands/stop.js";

const program = new Command();

program
  .name("ch")
  .description("Claude Helper — reusable CLI for Claude Code hooks")
  .version("1.0.0");

program
  .command("init")
  .description("Scaffold a .claude/ch.local.json config file")
  .action(() => {
    init();
  });

program
  .command("post-file-change")
  .description("Run configured checks after a file change")
  .action(async () => {
    await postFileChange();
  });

program
  .command("tool-block")
  .description("Check if a tool command should be blocked (PreToolUse hook)")
  .action(async () => {
    await toolBlock();
  });

program
  .command("log-session-start")
  .description("Start a new session log (SessionStart hook)")
  .action(async () => {
    await logSessionStart();
  });

program
  .command("log-action")
  .description("Log a tool action to the session log (PostToolUse hook)")
  .action(async () => {
    await logAction();
  });

program
  .command("stop")
  .description("Run project-wide checks (Stop hook)")
  .action(async () => {
    await stop();
  });

program.parse();

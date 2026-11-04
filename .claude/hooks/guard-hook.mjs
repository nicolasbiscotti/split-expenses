#!/usr/bin/env node
// Claude Code PreToolUse hook for Bash, registered in .claude/settings.json.
// Reads the hook input (JSON) from stdin; to block, exits 2 with the reason on
// stderr, which Claude Code shows to the model. The decision lives in
// guard.mjs; this wrapper only supplies the current branch per directory.
import { execFileSync } from "node:child_process";
import { checkCommand } from "./guard.mjs";

/** @param {string} dir */
function branchAt(dir) {
  try {
    return execFileSync("git", ["-C", dir, "rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
}

let raw = "";
for await (const chunk of process.stdin) raw += chunk;

try {
  const input = JSON.parse(raw);
  const command = input?.tool_input?.command;
  if (typeof command === "string") {
    const reason = checkCommand(command, { cwd: input.cwd ?? process.cwd(), branchAt });
    if (reason) {
      process.stderr.write(reason + "\n");
      process.exit(2);
    }
  }
} catch (error) {
  // Fail closed: a guard that silently stops guarding is worse than a retry.
  process.stderr.write(`guard-hook failed, blocking to be safe: ${error}\n`);
  process.exit(2);
}

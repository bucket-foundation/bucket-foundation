#!/usr/bin/env bun
import { applyColor, colorEnabled } from "./cli/out";
import { describeFailure, preflight, resolve } from "./cli/run";

async function main(argv: string[]): Promise<number> {
  const inv = resolve(argv);
  if (inv.kind === "help") {
    console.log(inv.text);
    return 0;
  }
  const tty = { stdin: !!process.stdin.isTTY, stdout: !!process.stdout.isTTY };
  preflight(inv, process.env, tty);
  applyColor(process.env, colorEnabled(process.env, tty));
  const { execute } = await import("./cli/commands");
  return execute(inv);
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (e) => {
    const { code, lines } = describeFailure(e);
    for (const l of lines) console.error(l);
    process.exit(code);
  },
);

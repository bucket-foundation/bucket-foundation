import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { completionScript, isShell, SHELLS } from "../src/cli/completion";
import { resolve, UsageError } from "../src/cli/run";
import { CLI_COMMANDS, optionsFor } from "../src/cli/table";

const CLI = join(import.meta.dir, "../src/cli.tsx");
const bash = process.platform === "win32" ? null : Bun.which("bash");

const lineFor = {
  bash: (script: string, name: string) => script.split("\n").find((l) => l.trimStart().startsWith(`'${name}') COMPREPLY`)),
  zsh: (script: string, name: string) => script.split("\n").find((l) => l.trimStart().startsWith(`('${name}') items=`)),
};

describe("bkt completion", () => {
  test("every command and every flag in the table appears in each script", () => {
    for (const shell of SHELLS) {
      const script = completionScript(shell);
      for (const c of CLI_COMMANDS) {
        for (const word of c.name.split(" ")) expect(script, `${shell} ${c.name}`).toContain(word);
        const names = Object.keys(optionsFor(c));
        expect(names.length, c.name).toBeGreaterThan(0);
        if (shell === "fish") {
          for (const n of names) expect(script, `fish ${c.name} --${n}`).toContain(`test (__bkt_command) = '\\''${c.name}'\\''' -l ${n}`);
        } else {
          const line = lineFor[shell](script, c.name);
          expect(line, `${shell} ${c.name}`).toBeDefined();
          for (const n of names) expect(line, `${shell} ${c.name} --${n}`).toMatch(new RegExp(`--${n}[ :']`));
        }
      }
    }
  });

  test("first words, families and shells are offered", () => {
    const firsts = [...new Set(CLI_COMMANDS.map((c) => c.name.split(" ")[0]))];
    const script = completionScript("bash");
    expect(script).toContain(`compgen -W '${firsts.join(" ")}'`);
    expect(script).toContain("hai) COMPREPLY=($(compgen -W 'freeze review score report export wipe'");
    expect(script).toContain("completion) COMPREPLY=($(compgen -W 'bash zsh fish'");
    expect(completionScript("zsh").split("\n")[0]).toBe("#compdef bkt");
    expect(completionScript("fish")).toContain("complete -c bkt -f -n 'test (__bkt_command) = '\\''completion'\\''' -a 'bash zsh fish'");
  });

  test("an unknown shell is a usage error", () => {
    expect(isShell("zsh")).toBe(true);
    expect(isShell("powershell")).toBe(false);
    expect(() => resolve(["completion", "powershell"])).toThrow(UsageError);
    expect(() => resolve(["completion", "powershell"])).toThrow("unknown shell powershell; use bash, zsh, fish");
    expect(() => resolve(["completion"])).toThrow("completion needs <bash|zsh|fish>");
  });

  test("the command prints the generated script and touches no data folder", () => {
    const dir = mkdtempSync(join(tmpdir(), "bkt-completion-"));
    try {
      const env = { PATH: join(dir, "bin"), HOME: join(dir, "user"), BKT_HOME: join(dir, "data"), TMPDIR: dir };
      for (const shell of SHELLS) {
        const r = Bun.spawnSync([process.execPath, CLI, "completion", shell], { env, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
        expect(r.exitCode).toBe(0);
        expect(r.stdout.toString()).toBe(`${completionScript(shell)}\n`);
      }
      const bad = Bun.spawnSync([process.execPath, CLI, "completion", "powershell"], { env, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
      expect(bad.exitCode).toBe(2);
      expect(bad.stderr.toString()).toStartWith("bkt: unknown shell powershell; use bash, zsh, fish\nusage: bkt completion <bash|zsh|fish> [options]");
      expect(existsSync(join(dir, "data"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

  test.skipIf(!bash)("bash loads the script and completes commands, subcommands and flags", () => {
    const dir = mkdtempSync(join(tmpdir(), "bkt-completion-"));
    try {
      const file = join(dir, "bkt.bash");
      writeFileSync(file, completionScript("bash"));
      const driver = [
        `source "${file}"`,
        't() { COMP_WORDS=("$@"); COMP_CWORD=$(($# - 1)); _bkt; echo "${COMPREPLY[*]}"; }',
        "t bkt do",
        "t bkt hai ''",
        "t bkt hai score --",
        "t bkt doctor --",
        "t bkt completion ''",
        "t bkt analyses --w",
      ].join("\n");
      const r = Bun.spawnSync([bash!, "--noprofile", "--norc", "-c", driver], { stdout: "pipe", stderr: "pipe" });
      expect(r.stderr.toString()).toBe("");
      expect(r.stdout.toString().trimEnd().split("\n")).toEqual([
        "doctor",
        "freeze review score report export wipe",
        "--dir --pilot --yes --dry-run --collect --abandon --max-usd --help",
        "--keyring --json --help",
        "bash zsh fish",
        "--where",
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

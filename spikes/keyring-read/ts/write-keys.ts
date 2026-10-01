import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LEGACY_ACCOUNTS, scopedAccounts } from "../../../packages/bkt/src/device";
import { platformFor } from "../../../packages/bkt/src/platform";

const [mode, work, releaseBin, branchBin] = process.argv.slice(2);
if (!mode || !work) throw new Error("usage: write-keys.ts write WORK RELEASE_BKT BRANCH_BKT | verify WORK");

const keyring = platformFor().keyring();
if (!keyring) throw new Error("the native keyring is unavailable");
const expected = join(work, "expected");
const digest = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 12);

function init(bin: string, data: string): void {
  const env = { ...process.env, BKT_HOME: data, BKT_UI_DIR: join(work, "no-ui") };
  const version = Bun.spawnSync([bin, "--version"], { env, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const r = Bun.spawnSync([bin, "init"], { env, stdin: "ignore", stdout: "pipe", stderr: "pipe", timeout: 120_000 });
  console.log(`${bin} ${version.stdout.toString().trim()} init: exit ${r.exitCode} ${r.stderr.toString().trim()}`);
  if (r.exitCode !== 0) throw new Error(`bkt init failed in ${data}`);
}

if (mode === "write") {
  mkdirSync(expected, { recursive: true });
  const legacyData = join(work, "data-040");
  const scopedData = join(work, "data-scoped");
  init(releaseBin, legacyData);
  if (existsSync(join(legacyData, "keyring-scope"))) throw new Error("the release binary wrote a scope file; it is not a 0.4.0 build");
  init(branchBin, scopedData);
  const scoped = scopedAccounts(readFileSync(join(scopedData, "keyring-scope"), "utf8").trim());
  const entries: [string, string][] = [
    ["legacy-data", LEGACY_ACCOUNTS.data],
    ["legacy-device", LEGACY_ACCOUNTS.device],
    ["scoped-data", scoped.data],
    ["scoped-device", scoped.device],
  ];
  for (const [kind, account] of entries) {
    const value = await keyring.get(account);
    if (value === null) throw new Error(`TypeScript finds no ${account}`);
    writeFileSync(join(expected, account), value, { mode: 0o600 });
    console.log(`TypeScript read ${kind} ${account}: ${Buffer.byteLength(value)} bytes, sha256 ${digest(value)}`);
  }
  writeFileSync(join(work, "accounts.txt"), entries.map((e) => e.join(" ")).join("\n") + "\n");
} else {
  let bad = 0;
  for (const line of readFileSync(join(work, "accounts.txt"), "utf8").trim().split("\n")) {
    const [kind, account] = line.split(" ");
    const value = await keyring.get(account);
    const same = value === readFileSync(join(expected, account), "utf8");
    if (!same) bad += 1;
    console.log(`TypeScript reads ${kind} again: ${same ? "identical" : "DIFFERENT"}, sha256 ${value === null ? "none" : digest(value)}`);
  }
  if (bad) process.exit(1);
}

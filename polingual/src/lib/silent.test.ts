import { test } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isSilent, needsSound, setSilent, subscribeSilent } from "./silent";

function memory(): Storage {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } as unknown as Storage;
}

test("silent mode persists on the device and notifies listeners", () => {
  const st = memory();
  let calls = 0;
  const off = subscribeSilent(() => calls++);
  assert.equal(isSilent(st), false);
  setSilent(true, st);
  assert.equal(isSilent(st), true);
  setSilent(false, st);
  assert.equal(calls, 2);
  off();
});

test("only voice and sound questions wait in silent mode", () => {
  for (const k of ["listen", "type-heard", "spell-heard", "speak"]) assert.equal(needsSound(k), true, k);
  for (const k of ["intro", "choose", "reverse", "translate", "cloze", "match", "gender", "letter"]) assert.equal(needsSound(k), false, k);
});

test("the session defers sound questions with skip, which never grades, so their schedule stays", () => {
  const session = readFileSync(join(process.cwd(), "src/app/(site)/app/[system]/study/Session.tsx"), "utf8");
  assert.match(session, /if \(!silent \|\| !needsSound\(kind\)\) return;[\s\S]*skip\(\);/);
  const hook = readFileSync(join(process.cwd(), "../src/app/research-os/(app)/learn/languages/useLangSession.ts"), "utf8");
  assert.match(hook, /const skip = useCallback\(\(\) => setI\(\(x\) => x \+ 1\), \[\]\);/);
});

test("all language versions play together only on the word page", () => {
  const hits = execSync("grep -rl 'playAll' src/app || true", { encoding: "utf8" }).trim().split("\n").filter(Boolean);
  assert.deepEqual(hits, ["src/app/(site)/word/Speak.tsx"]);
});

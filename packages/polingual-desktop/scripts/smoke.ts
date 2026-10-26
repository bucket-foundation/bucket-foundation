import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [exe] = process.argv.slice(2);
if (!exe) throw new Error("usage: smoke.ts <app executable>");
const waitMs = Number(process.env.POLINGUAL_SMOKE_WAIT_MS ?? 90_000);
const LINK = "polingual://learn";
const record = join(mkdtempSync(join(tmpdir(), "polingual-smoke-")), "record.json");
const env = { ...process.env, POLINGUAL_SMOKE_RECORD: record };
const failures: string[] = [];

type Record = { pid: number; routes: string[]; online: boolean };
const read = (): Record | null => {
  try {
    return existsSync(record) ? (JSON.parse(readFileSync(record, "utf8")) as Record) : null;
  } catch {
    return null;
  }
};

async function until<T>(ms: number, f: () => T | null | undefined | false): Promise<T | null> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = f();
    if (v) return v;
    await Bun.sleep(500);
  }
  return null;
}

const first = Bun.spawn([exe], { env, stdout: "inherit", stderr: "inherit" });
const started = await until(waitMs, () => first.exitCode === null && read());
if (first.exitCode !== null) failures.push(`app exited with ${first.exitCode}`);
if (!started) failures.push(`the app wrote no ${record}`);
else {
  console.log(JSON.stringify({ started }));
  const second = Bun.spawn([exe, LINK], { env, stdout: "inherit", stderr: "inherit" });
  const handed = await until(30_000, () => second.exitCode !== null);
  if (!handed) {
    failures.push("the second launch did not hand off and exit");
    second.kill(9);
  }
  const routed = await until(10_000, () => read()?.routes.includes("/learn") && read());
  if (!routed) failures.push(`the running app did not take ${LINK}`);
  else if (routed.pid !== started.pid) failures.push("a second app instance took the link");
  if (first.exitCode !== null) failures.push(`the first instance exited with ${first.exitCode} after the deep link`);
  console.log(JSON.stringify({ routed }));
}
try {
  process.kill(started?.pid ?? first.pid, "SIGTERM");
} catch (e) {
  failures.push(`could not send SIGTERM: ${(e as Error).message}`);
}
const gone = await until(20_000, () => first.exitCode !== null);
if (!gone) {
  failures.push("the app ignored SIGTERM");
  first.kill(9);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("smoke passed");
process.exit(0);

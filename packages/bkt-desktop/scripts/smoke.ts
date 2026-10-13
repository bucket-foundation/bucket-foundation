import { readFileSync } from "node:fs";
import { alive, appRecordPath, parentPid, probe, readRecord, secondLaunch, waitGone, type AppRecord } from "./probe";

const [exe, ...args] = process.argv.slice(2);
if (!exe) throw new Error("usage: smoke.ts <app executable> [args]");
const strict = process.env.BKT_SMOKE_STRICT === "1";
const SMOKE_LINK = "bucket://quiz/2026-09-30";
const waitMs = Number(process.env.BKT_SMOKE_WAIT_MS ?? 90_000);
const goneMs = Number(process.env.BKT_SMOKE_GONE_MS ?? 20_000);
const recordPath = appRecordPath(process.env, process.getuid?.());
const failures: string[] = [];

async function launch(skipPid: number | null) {
  const app = Bun.spawn([exe, ...args], { stdout: "inherit", stderr: "pipe" });
  const out = { log: "" };
  void (async () => {
    const text = new TextDecoder();
    for await (const chunk of app.stderr) {
      const s = text.decode(chunk);
      out.log += s;
      process.stderr.write(s);
    }
  })();
  const deadline = Date.now() + waitMs;
  let record: AppRecord | null = null;
  while (Date.now() < deadline && app.exitCode === null && record === null) {
    await Bun.sleep(1000);
    const r = readRecord(recordPath);
    if (r && r.pid !== skipPid && alive(r.pid)) record = r;
  }
  return { app, out, record };
}

async function stop(run: Awaited<ReturnType<typeof launch>>, signal: "SIGTERM" | "SIGKILL") {
  const { app, record } = run;
  if (record) {
    const shell = parentPid(record.pid) ?? app.pid;
    try {
      process.kill(shell, signal);
    } catch (e) {
      console.warn(`could not send ${signal} to the shell ${shell}: ${(e as Error).message}`);
    }
    const gone = await waitGone(record.pid, goneMs);
    console.log(JSON.stringify({ signal, shell, sidecar: record.pid, sidecarGone: gone }));
    if (!gone) {
      failures.push(`the sidecar ${record.pid} outlived the app after ${signal}`);
      try {
        process.kill(record.pid, "SIGKILL");
      } catch {
        console.warn(`the leaked sidecar ${record.pid} was already gone at cleanup`);
      }
    }
  }
  app.kill(9);
  await app.exited;
}

const first = await launch(null);
if (first.app.exitCode !== null) failures.push(`app exited with ${first.app.exitCode}`);
if (first.record === null) {
  if (strict) failures.push(`bkt serve wrote no ${recordPath}`);
  else console.warn(`bkt serve wrote no ${recordPath}; sidecar checks skipped`);
} else {
  const r = await probe(first.record.port);
  console.log(JSON.stringify({ port: first.record.port, ...r }));
  if (!r.page) failures.push("sidecar did not serve the bkt-ui page");
  if (!r.uiBundle) failures.push("sidecar did not serve the bundled bkt-ui assets");
  if (!r.forgedNonceRejected) failures.push("sidecar accepted a forged launch nonce");
  if (!r.noTokenRejected) failures.push("sidecar served /local without a session token");
  const before = readFileSync(recordPath, "utf8");
  const second = await secondLaunch({
    spawn: (argv) => Bun.spawn(argv, { stdout: "inherit", stderr: "inherit" }),
    exe,
    link: SMOKE_LINK,
    record: () => readFileSync(recordPath, "utf8"),
    before,
    log: () => first.out.log,
    firstAlive: () => first.app.exitCode === null,
  });
  console.log(JSON.stringify({ secondLaunch: second }));
  for (const f of second) {
    if (strict) failures.push(f);
    else console.warn(`${f}; second launch checks are advisory here`);
  }
}
await stop(first, "SIGTERM");

if (first.record !== null) {
  const again = await launch(first.record.pid);
  if (again.record === null) failures.push("the app did not start a sidecar on the second run");
  await stop(again, "SIGKILL");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("smoke passed");
process.exit(0);

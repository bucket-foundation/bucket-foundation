import { readFileSync } from "node:fs";
import { appRecordPath, probe, readPort, secondLaunch } from "./probe";

const [exe, ...args] = process.argv.slice(2);
if (!exe) throw new Error("usage: smoke.ts <app executable> [args]");
const strict = process.env.BKT_SMOKE_STRICT === "1";
const SMOKE_LINK = "bucket://quiz/2026-09-30";
const waitMs = Number(process.env.BKT_SMOKE_WAIT_MS ?? 90_000);
const recordPath = appRecordPath(process.env, process.getuid?.());

const app = Bun.spawn([exe, ...args], { stdout: "inherit", stderr: "pipe" });
let log = "";
void (async () => {
  const text = new TextDecoder();
  for await (const chunk of app.stderr) {
    const s = text.decode(chunk);
    log += s;
    process.stderr.write(s);
  }
})();
const deadline = Date.now() + waitMs;
let port: number | null = null;
while (Date.now() < deadline && app.exitCode === null && port === null) {
  await Bun.sleep(1000);
  port = readPort(recordPath);
}

const failures: string[] = [];
if (app.exitCode !== null) failures.push(`app exited with ${app.exitCode}`);
if (port === null) {
  if (strict) failures.push(`bkt serve wrote no ${recordPath}`);
  else console.warn(`bkt serve wrote no ${recordPath}; sidecar checks skipped`);
} else {
  const r = await probe(port);
  console.log(JSON.stringify({ port, ...r }));
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
    log: () => log,
    firstAlive: () => app.exitCode === null,
  });
  console.log(JSON.stringify({ secondLaunch: second }));
  for (const f of second) {
    if (strict) failures.push(f);
    else console.warn(`${f}; second launch checks are advisory here`);
  }
}
app.kill();
await app.exited;
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("smoke passed");

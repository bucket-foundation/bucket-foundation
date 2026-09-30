import { appRecordPath, probe, readPort } from "./probe";

const [exe, ...args] = process.argv.slice(2);
if (!exe) throw new Error("usage: smoke.ts <app executable> [args]");
const strict = process.env.BKT_SMOKE_STRICT === "1";
const waitMs = Number(process.env.BKT_SMOKE_WAIT_MS ?? 90_000);
const recordPath = appRecordPath(process.env, process.getuid?.());

const app = Bun.spawn([exe, ...args], { env: { ...process.env, BUCKET_NO_UPDATE: "1" }, stdout: "inherit", stderr: "inherit" });
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
}
app.kill();
await app.exited;
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("smoke passed");

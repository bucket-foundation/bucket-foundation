import { expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appRecordPath, probe, readPort, secondLaunch, type SecondLaunch } from "./probe";

test("finds app.json where bkt writes it", () => {
  expect(appRecordPath({ XDG_RUNTIME_DIR: "/run/user/7" }, 7)).toBe(join("/run/user/7", "bucket", "app.json"));
  expect(appRecordPath({}, undefined)).toBe(join(tmpdir(), "bucket-user", "bucket", "app.json"));
  expect(appRecordPath({ TMPDIR: "/t" }, 7)).toBe(join("/t", "bucket-7", "bucket", "app.json"));
});

test("reads the port or reports none", () => {
  const dir = mkdtempSync(join(tmpdir(), "bkt-probe-"));
  const p = join(dir, "app.json");
  expect(readPort(p)).toBeNull();
  writeFileSync(p, JSON.stringify({ pid: 1, port: 4321 }));
  expect(readPort(p)).toBe(4321);
});

test("flags a sidecar that skips authentication", async () => {
  const open = (async () => new Response("ok", { status: 200 })) as unknown as typeof fetch;
  expect(await probe(1, open)).toEqual({ page: false, uiBundle: true, forgedNonceRejected: false, noTokenRejected: false });
  const locked = (async (u: string) =>
    String(u).endsWith("/") ? new Response("<script>window.__BKT__={}</script>") : String(u).endsWith(".js") ? new Response("js") : new Response(null, { status: 403 })) as unknown as typeof fetch;
  const claimed = (async (u: string) => new Response(null, { status: String(u).endsWith("/") ? 410 : 403 })) as unknown as typeof fetch;
  expect((await probe(1, claimed)).page).toBe(true);
  expect(await probe(1, locked)).toEqual({ page: true, uiBundle: true, forgedNonceRejected: true, noTokenRejected: true });
});

const LINK = "bucket://quiz/2026-09-30";
const second = (over: Partial<SecondLaunch> = {}): SecondLaunch => ({
  spawn: () => ({ exited: Promise.resolve(0), kill: () => {} }),
  exe: "/usr/bin/bucket-desktop",
  link: LINK,
  record: () => '{"pid":7,"port":4321}',
  before: '{"pid":7,"port":4321}',
  log: () => "bucket opened /work/daily/2026-09-30\n",
  firstAlive: () => true,
  exitMs: 30,
  routeMs: 30,
  sleep: (ms) => new Promise((r) => setTimeout(r, Math.min(ms, 5))),
  ...over,
});

test("a second launch that hands over its link and exits passes", async () => {
  const argv: string[][] = [];
  expect(await secondLaunch(second({ spawn: (a) => (argv.push(a), { exited: Promise.resolve(0), kill: () => {} }) }))).toEqual([]);
  expect(argv).toEqual([["/usr/bin/bucket-desktop", LINK]]);
});

test("a second launch that stays up, fails, starts a sidecar, kills the app or opens no route is flagged", async () => {
  let killed = false;
  const stuck = await secondLaunch(second({ spawn: () => ({ exited: new Promise<number>(() => {}), kill: () => (killed = true) }) }));
  expect(stuck).toEqual(["a second launch kept running beside the first app"]);
  expect(killed).toBe(true);
  expect(await secondLaunch(second({ spawn: () => ({ exited: Promise.resolve(3), kill: () => {} }) }))).toEqual(["a second launch exited with 3"]);
  expect(await secondLaunch(second({ record: () => '{"pid":8,"port":5000}' }))).toEqual(["the sidecar record changed after a second launch, so a second sidecar started"]);
  expect(
    await secondLaunch(
      second({
        record: () => {
          throw new Error("gone");
        },
      }),
    ),
  ).toEqual(["the sidecar record changed after a second launch, so a second sidecar started"]);
  expect(await secondLaunch(second({ firstAlive: () => false }))).toEqual(["the first app exited after a second launch"]);
  expect(await secondLaunch(second({ log: () => "bucket opened /work/daily/2026-09-29" }))).toEqual(["the first app did not open the linked quiz route"]);
});

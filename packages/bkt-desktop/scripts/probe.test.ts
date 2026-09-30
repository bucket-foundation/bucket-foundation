import { expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appRecordPath, probe, readPort } from "./probe";

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

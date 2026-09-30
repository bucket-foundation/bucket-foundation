import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { openLaunchScope } from "./lib/test-harness";
import { magicFits, marketingExtension, mediaTypeFits } from "../src/lib/research-os/marketing/sniff";
import { open, parseSealKeys, seal } from "../src/lib/research-os/marketing/seal";
import { admit, MAX_PER_HOUR, resetLimiter } from "../src/lib/research-os/marketing/limiter";
import { runAnalyzer, scrubReport } from "../src/lib/research-os/marketing/runner";
import { deleteMarketingImport, fromBytea, inputDigest, toBytea, type Remover } from "../src/lib/research-os/marketing/store";
import { pathConflict, recordImportFile } from "../src/lib/research-os/import-upload";

openLaunchScope();

/* eslint-disable @typescript-eslint/no-var-requires */
const db = require("@/lib/research-os/db") as Record<string, unknown>;
const consent = require("@/lib/research-os/consent") as Record<string, unknown>;
const upload = require("@/lib/research-os/import-upload") as Record<string, unknown>;
const store = require("@/lib/research-os/marketing/store") as Record<string, unknown>;
const runner = require("@/lib/research-os/marketing/runner") as Record<string, unknown>;
const route = require("../src/app/api/research-os/marketing/route") as Record<string, (req: NextRequest) => Promise<Response>>;
const importRoute = require("../src/app/api/research-os/import/route") as Record<string, (req: NextRequest) => Promise<Response>>;
/* eslint-enable @typescript-eslint/no-var-requires */

const ROOT = join(__dirname, "..");
const FIX = join(ROOT, "packages/bkt/analyze/tests/fixtures/marketing");
const OWNER = "00000000-0000-4000-8000-0000000000a1";
const OTHER = "00000000-0000-4000-8000-0000000000b2";
const KEY_A = Buffer.alloc(32, 7).toString("base64");
const KEY_B = Buffer.alloc(32, 9).toString("base64");
const SHA = "a".repeat(64);
const PYTHON = process.env.BKT_TEST_PYTHON || "python3";

const enc = (s: string) => new TextEncoder().encode(s);

test("magic bytes gate every format and text must be UTF-8 without NUL", () => {
  assert.equal(magicFits("xlsx", new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1])), true);
  assert.equal(magicFits("xlsx", enc("a,b\n1,2")), false);
  assert.equal(magicFits("pdf", enc("%PDF-1.4")), true);
  assert.equal(magicFits("pdf", enc("<html>")), false);
  assert.equal(magicFits("parquet", enc("PAR1....")), true);
  assert.equal(magicFits("csv", enc("date,spend\n2026-01-01,1\n")), true);
  assert.equal(magicFits("csv", new Uint8Array([0x61, 0x00, 0x62])), false);
  assert.equal(magicFits("csv", new Uint8Array([0xc3, 0x28])), false);
  assert.equal(magicFits("tsv", new Uint8Array([0xff, 0xfe, 0x61, 0x00])), true);
  assert.equal(magicFits("json", new Uint8Array([0xff, 0xfe, 0x61, 0x00])), false);
  assert.equal(marketingExtension("Report.XLSX"), "xlsx");
  assert.equal(marketingExtension("evil.exe"), null);
  assert.equal(mediaTypeFits("pdf", "application/pdf"), true);
  assert.equal(mediaTypeFits("pdf", "text/html"), false);
});

test("a sealed report opens only with its owner, import and digest, and old keys keep opening after rotation", () => {
  const keys = parseSealKeys(`k1:${KEY_A}`)!;
  const ctx = { ownerId: OWNER, importId: "imp-1", inputDigest: SHA };
  const sealed = seal(keys, '{"a":1}', ctx);
  assert.equal(sealed.iv.length, 12);
  assert.ok(!sealed.ciphertext.toString("utf8").includes('"a"'));
  assert.equal(open(keys, sealed, ctx), '{"a":1}');
  assert.equal(open(keys, sealed, { ...ctx, ownerId: OTHER }), null);
  assert.equal(open(keys, sealed, { ...ctx, importId: "imp-2" }), null);
  assert.equal(open(keys, sealed, { ...ctx, inputDigest: "b".repeat(64) }), null);
  const tampered = { ...sealed, ciphertext: Buffer.from(sealed.ciphertext) };
  tampered.ciphertext[0] ^= 1;
  assert.equal(open(keys, tampered, ctx), null);
  const rotated = parseSealKeys(`k2:${KEY_B},k1:${KEY_A}`)!;
  assert.equal(rotated.current.id, "k2");
  assert.equal(open(rotated, sealed, ctx), '{"a":1}');
  assert.equal(seal(rotated, "x", ctx).keyId, "k2");
  assert.equal(open(parseSealKeys(`k2:${KEY_B}`)!, sealed, ctx), null);
  for (const bad of [undefined, "", "k1", `k1:${Buffer.alloc(16).toString("base64")}`, `K!:${KEY_A}`, `k1:${KEY_A},k1:${KEY_B}`]) assert.equal(parseSealKeys(bad), null, String(bad));
  assert.deepEqual(fromBytea(toBytea(Buffer.from([1, 2, 255]))), Buffer.from([1, 2, 255]));
});

test("the limiter admits two at once, one per owner, and twenty an hour", () => {
  resetLimiter();
  const a = admit("o1", 0);
  assert.equal(a.ok, true);
  assert.deepEqual(admit("o1", 1), { ok: false, error: "owner_busy" });
  const b = admit("o2", 2);
  assert.equal(b.ok, true);
  assert.deepEqual(admit("o3", 3), { ok: false, error: "busy" });
  if (a.ok) a.release();
  if (a.ok) a.release();
  assert.equal(admit("o3", 4).ok, true);
  resetLimiter();
  for (let i = 0; i < MAX_PER_HOUR; i += 1) {
    const s = admit("o9", i);
    assert.equal(s.ok, true);
    if (s.ok) s.release();
  }
  assert.deepEqual(admit("o9", 100), { ok: false, error: "rate_limited" });
  assert.equal(admit("o9", 60 * 60 * 1000 + 50).ok, true);
  resetLimiter();
});

test("with no analyzer interpreter the runner answers analysis_local_only and spawns nothing", async () => {
  const r = await runAnalyzer({ files: ["/nonexistent.csv"], outDir: "/nonexistent", names: ["x.csv"] }, {});
  assert.deepEqual(r, { ok: false, error: "analysis_local_only" });
});

test("a runaway analyzer is killed at the deadline", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mkt-"));
  const script = join(dir, "slow.py");
  writeFileSync(script, "import time\ntime.sleep(30)\n");
  const started = Date.now();
  const r = await runAnalyzer({ files: [], outDir: dir, names: [] }, { BKT_ANALYZE_PYTHON: PYTHON, BKT_ANALYZE_SCRIPT: script, PATH: process.env.PATH }, 500);
  assert.deepEqual(r, { ok: false, error: "analysis_timeout" });
  assert.ok(Date.now() - started < 5000);
});

test("the web runner and the CLI produce the same marketing section", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mkt-"));
  const files = [join(FIX, "meta_ads.csv"), join(FIX, "shopify_orders.csv")];
  const web = await runAnalyzer({ files, outDir: join(dir, "web"), names: ["meta.csv", "shop.csv"] }, { BKT_ANALYZE_PYTHON: PYTHON, PATH: process.env.PATH, HOME: process.env.HOME });
  assert.equal(web.ok, true, JSON.stringify(web));
  const cli = spawnSync(PYTHON, [join(ROOT, "packages/bkt/analyze/bkt_analyze.py"), ...files, "--no-helix", "--marketing", "on", "--out", join(dir, "cli")], { encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr);
  const cliReport = JSON.parse(cli.stdout.trim().split("\n").pop()!) as { marketing: { by_currency: unknown } };
  const webReport = (web as unknown as { report: { marketing: { by_currency: unknown; sources: { file: string }[] }; dir?: string } }).report;
  assert.deepEqual(webReport.marketing.by_currency, cliReport.marketing.by_currency);
  assert.deepEqual(webReport.marketing.sources.map((s) => s.file), ["meta.csv", "shop.csv"]);
  assert.equal(webReport.dir, undefined);
  assert.ok(!JSON.stringify(webReport).includes(dir), "the report carries a server path");
});

test("scrubReport drops paths and renames temp files to their upload names", () => {
  const out = scrubReport(
    { dir: "/tmp/x/out", helix: { run_dir: "/tmp/x" }, form: { file: "/tmp/x/0.csv" }, marketing: { sources: [{ file: "0.csv" }], files: [{ file: "/tmp/x/1.xlsx" }], warnings: [{ where: "0.csv: Cost", code: "W" }] } },
    { files: ["/tmp/x/0.csv", "/tmp/x/1.xlsx"], names: ["ads.csv", "shop.xlsx"] },
  );
  assert.deepEqual(out, { form: { file: "ads.csv" }, marketing: { sources: [{ file: "ads.csv" }], files: [{ file: "shop.xlsx" }], warnings: [{ where: "ads.csv: Cost", code: "W" }] } });
});

interface Table {
  rows: Record<string, unknown>[];
  error?: string;
}

function fakeGraph(tables: Record<string, Table>, log: string[] = []) {
  const make = (name: string) => {
    const table = tables[name] ?? { rows: [] };
    const filters: ((r: Record<string, unknown>) => boolean)[] = [];
    let mode = "select";
    const rows = () => table.rows.filter((r) => filters.every((f) => f(r)));
    const q: Record<string, unknown> = {
      select: () => q,
      eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), q),
      order: () => q,
      limit: () => q,
      delete: () => ((mode = "delete"), q),
      maybeSingle: async () => (table.error ? { data: null, error: { message: table.error } } : { data: rows()[0] ?? null, error: null }),
      range: async (from: number, to: number) => (table.error ? { data: null, error: { message: table.error } } : { data: rows().slice(from, to + 1), error: null }),
      then: (resolve: (v: unknown) => void) => {
        if (table.error) return resolve({ data: null, error: { message: table.error } });
        if (mode === "delete") {
          const doomed = rows();
          table.rows = table.rows.filter((r) => !doomed.includes(r));
          log.push(`delete ${name} ${doomed.length}`);
        }
        return resolve({ data: rows(), error: null });
      },
    };
    return q;
  };
  return { from: (name: string) => make(name) } as unknown as SupabaseClient;
}

const fileRow = (importId: string, sha: string, owner = OWNER) => ({ id: `f-${importId}-${sha[0]}`, import_id: importId, sha256: sha, bytes: 10, media_type: "text/csv", filename: "a.csv", storage_path: `${owner}/${sha}`, created_at: "2026-09-30T00:00:00Z" });

test("paths shared with a node-linked import block a marketing import, and marketing paths block any other import", async () => {
  const svc = fakeGraph({
    imports: { rows: [{ id: "mkt", node_id: null, source: { marketing: true } }, { id: "pub", node_id: "node-1", source: {} }, { id: "plain", node_id: "node-2", source: {} }] },
    import_files: { rows: [fileRow("mkt", SHA), fileRow("pub", "b".repeat(64)), fileRow("mkt", "b".repeat(64))] },
  });
  assert.equal(await pathConflict(svc, "mkt", `${OWNER}/${"b".repeat(64)}`), "object_shared");
  assert.equal(await pathConflict(svc, "plain", `${OWNER}/${SHA}`), "object_marketing");
  assert.equal(await pathConflict(svc, "mkt", `${OWNER}/${SHA}`), null);
  const recorded = await recordImportFile(svc, "plain", { ownerId: OWNER, sha256: SHA, bytes: 10, mediaType: "text/csv", filename: "a.csv", storagePath: `${OWNER}/${SHA}` });
  assert.deepEqual(recorded.ok ? null : recorded.error, "object_marketing");
});

test("delete keeps an object another import still names, removes the rest, and stops on a storage failure", async () => {
  const shared = "c".repeat(64);
  const tables = {
    import_files: { rows: [fileRow("mkt", SHA), fileRow("mkt", shared), fileRow("other", shared)] },
    imports: { rows: [{ id: "mkt", owner_id: OWNER }] },
  };
  const removed: string[][] = [];
  const ok: Remover = { remove: async (paths) => (removed.push(paths), { data: null, error: null }) };
  const res = await deleteMarketingImport(fakeGraph(tables), ok, "mkt", OWNER);
  assert.deepEqual(res, { ok: true, files: 2, objectsRemoved: 1 });
  assert.deepEqual(removed, [[`${OWNER}/${SHA}`]]);
  const failing: Remover = { remove: async () => ({ data: null, error: { message: "boom" } }) };
  const log: string[] = [];
  const again = await deleteMarketingImport(fakeGraph({ import_files: { rows: [fileRow("mkt", SHA)] }, imports: { rows: [{ id: "mkt", owner_id: OWNER }] } }, log), failing, "mkt", OWNER);
  assert.deepEqual(again.ok ? null : again.error, "storage_failed");
  assert.deepEqual(log, [], "no row is deleted when storage fails");
});

test("inputDigest ignores file order", () => {
  assert.equal(inputDigest([{ sha256: "b".repeat(64) }, { sha256: SHA }]), inputDigest([{ sha256: SHA }, { sha256: "b".repeat(64) }]));
});

function req(method: string, body?: unknown, query = "") {
  return new NextRequest(`http://localhost/api/research-os/marketing${query}`, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { "content-type": "application/json" } });
}

function captureErrors<T>(fn: () => Promise<T>): Promise<{ value: T; logged: string }> {
  const logged: unknown[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => void logged.push(args);
  return fn().then(
    (value) => ((console.error = original), { value, logged: JSON.stringify(logged) }),
    (e) => {
      console.error = original;
      throw e;
    },
  );
}

function routeWorld(opts: { files?: ReturnType<typeof fileRow>[]; conflict?: string | null; report?: Record<string, unknown> | null; owned?: boolean } = {}) {
  process.env.MARKETING_SEAL_KEYS = `k1:${KEY_A}`;
  db.verifyLearner = async () => OWNER;
  db.graphService = () => ({ storage: { from: () => ({ download: async () => ({ data: new Blob([enc("date,spend,clicks\n2026-01-01,1,2\n")]), error: null }) }) } });
  consent.requireConsent = async () => ({ allowed: true });
  store.marketingImport = async () => (opts.owned === false ? null : { id: "mkt", title: "t" });
  upload.listImportFiles = async () => opts.files ?? [fileRow("mkt", SHA)];
  upload.pathConflict = async () => opts.conflict ?? null;
  store.analyzerVersion = () => "0123456789abcdef";
  store.findReport = async () => opts.report ?? null;
  store.saveReport = async (_svc: unknown, row: { importId: string; digest: string; version: string; sealed: { keyId: string; iv: Buffer; ciphertext: Buffer } }) => ({
    id: "r1", import_id: row.importId, input_digest: row.digest, analyzer_version: row.version, key_id: row.sealed.keyId, iv: toBytea(row.sealed.iv), ciphertext: toBytea(row.sealed.ciphertext), created_at: "now",
  });
  resetLimiter();
}

test("the route refuses a caller with no session", async () => {
  routeWorld();
  db.verifyLearner = async () => null;
  assert.equal((await route.POST(req("POST", { action: "analyze", importId: "mkt" }))).status, 401);
});

test("the route fails closed with no sealing key", async () => {
  routeWorld();
  delete process.env.MARKETING_SEAL_KEYS;
  let ran = false;
  runner.runAnalyzer = async () => ((ran = true), { ok: false, error: "analysis_failed" });
  const res = await route.POST(req("POST", { action: "analyze", importId: "mkt" }));
  assert.equal(res.status, 503);
  assert.equal(((await res.json()) as { error: string }).error, "seal_key_missing");
  assert.equal(ran, false);
  assert.equal((await route.GET(req("GET", undefined, "?import=mkt"))).status, 503);
});

test("another owner's import is not found", async () => {
  routeWorld({ owned: false });
  assert.equal((await route.POST(req("POST", { action: "analyze", importId: "mkt" }))).status, 404);
  assert.equal((await route.GET(req("GET", undefined, "?import=mkt"))).status, 404);
  assert.equal((await route.DELETE(req("DELETE", undefined, "?import=mkt"))).status, 404);
});

test("size, count, type and shared-object limits answer before any analysis", async () => {
  const big = { ...fileRow("mkt", SHA), bytes: 17 * 1024 * 1024 };
  const exe = { ...fileRow("mkt", SHA), filename: "x.exe" };
  const nine = Array.from({ length: 9 }, (_, i) => fileRow("mkt", String(i).repeat(64)));
  const cases: [Parameters<typeof routeWorld>[0], number, string][] = [
    [{ files: [big] }, 413, "file_too_large"],
    [{ files: [exe] }, 415, "unsupported_type"],
    [{ files: nine }, 413, "too_many_files"],
    [{ files: [] }, 409, "no_files"],
    [{ conflict: "object_shared" }, 409, "object_shared"],
  ];
  for (const [world, status, error] of cases) {
    routeWorld(world);
    let ran = false;
    runner.runAnalyzer = async () => ((ran = true), { ok: false, error: "analysis_failed" });
    const res = await route.POST(req("POST", { action: "analyze", importId: "mkt" }));
    assert.equal(res.status, status, error);
    assert.equal(((await res.json()) as { error: string }).error, error);
    assert.equal(ran, false, error);
  }
});

test("content that does not match its extension is refused with 415", async () => {
  routeWorld({ files: [{ ...fileRow("mkt", SHA), filename: "a.xlsx", media_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes: "date,spend,clicks\n2026-01-01,1,2\n".length, sha256: require("node:crypto").createHash("sha256").update("date,spend,clicks\n2026-01-01,1,2\n").digest("hex") }] });
  let ran = false;
  runner.runAnalyzer = async () => ((ran = true), { ok: false, error: "analysis_failed" });
  const res = await route.POST(req("POST", { action: "analyze", importId: "mkt" }));
  assert.equal(res.status, 415);
  assert.equal(ran, false);
});

test("an analysis seals its report, a repeat returns the saved one, and logs carry codes only", async () => {
  const body = "date,spend,clicks\n2026-01-01,1,2\n";
  const sha = require("node:crypto").createHash("sha256").update(body).digest("hex") as string;
  routeWorld({ files: [{ ...fileRow("mkt", sha), filename: "Secret Campaign.csv", bytes: body.length }] });
  let saved: Record<string, unknown> | null = null;
  const realSave = store.saveReport as (...a: unknown[]) => Promise<Record<string, unknown>>;
  store.saveReport = async (...a: unknown[]) => (saved = await realSave(...a));
  runner.runAnalyzer = async (input: { names: string[] }) => ({ ok: true, report: { marketing: { sources: [{ file: input.names[0] }] } } });
  const first = await route.POST(req("POST", { action: "analyze", importId: "mkt" }));
  assert.equal(first.status, 201);
  const firstBody = (await first.json()) as { report: { marketing: { sources: { file: string }[] } } };
  assert.equal(firstBody.report.marketing.sources[0].file, "Secret Campaign.csv");
  assert.ok(saved && !fromBytea((saved as { ciphertext: string }).ciphertext).toString("utf8").includes("Secret"), "the stored report is plaintext");
  routeWorld({ files: [{ ...fileRow("mkt", sha), filename: "Secret Campaign.csv", bytes: body.length }], report: saved });
  let ran = false;
  runner.runAnalyzer = async () => ((ran = true), { ok: false, error: "analysis_failed" });
  const again = await route.POST(req("POST", { action: "analyze", importId: "mkt" }));
  assert.equal(again.status, 200);
  assert.equal(((await again.json()) as { repeat: boolean }).repeat, true);
  assert.equal(ran, false);
  const got = await route.GET(req("GET", undefined, "?import=mkt"));
  assert.equal(got.status, 200);
  routeWorld({ files: [{ ...fileRow("mkt", sha), filename: "Secret Campaign.csv", bytes: body.length }] });
  runner.runAnalyzer = async () => ({ ok: false, error: "analysis_failed" });
  const { value, logged } = await captureErrors(() => route.POST(req("POST", { action: "analyze", importId: "mkt" })));
  assert.equal(value.status, 422);
  assert.ok(!logged.includes("Secret") && !logged.includes("2026-01-01"), logged);
  assert.ok(logged.includes("analysis_failed"));
});

test("the limiter answers 429 for an owner already running", async () => {
  routeWorld();
  const held = admit(OWNER);
  runner.runAnalyzer = async () => ({ ok: false, error: "analysis_failed" });
  const res = await route.POST(req("POST", { action: "analyze", importId: "mkt" }));
  assert.equal(res.status, 429);
  if (held.ok) held.release();
});

test("delete answers 502 on a storage failure and 200 with counts otherwise", async () => {
  routeWorld();
  store.deleteMarketingImport = async () => ({ ok: false, error: "storage_failed", detail: "x" });
  assert.equal((await route.DELETE(req("DELETE", undefined, "?import=mkt"))).status, 502);
  store.deleteMarketingImport = async () => ({ ok: true, files: 2, objectsRemoved: 1 });
  const res = await route.DELETE(req("DELETE", undefined, "?import=mkt"));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { deleted: true, files: 2, objectsRemoved: 1 });
});

test("attach refuses bytes that belong to a marketing import", async () => {
  routeWorld();
  upload.ownedImport = async () => ({ id: "plain", nodeId: "node-1", nodeSlug: "n" });
  upload.verifyUpload = async () => ({ ok: true, value: { bytes: 10, sha256: SHA } });
  upload.recordImportFile = async () => ({ ok: false, error: "object_marketing", detail: "x" });
  const res = await importRoute.POST(
    new NextRequest("http://localhost/api/research-os/import", { method: "POST", body: JSON.stringify({ action: "attach", importId: "plain", filename: "a.csv", mediaType: "text/csv", bytes: 10, sha256: SHA }) }),
  );
  assert.equal(res.status, 409);
  assert.equal(((await res.json()) as { error: string }).error, "object_marketing");
});

test("the marketing code reaches no network", () => {
  const ts = [
    join(ROOT, "src/app/api/research-os/marketing/route.ts"),
    ...readdirSync(join(ROOT, "src/lib/research-os/marketing")).map((f) => join(ROOT, "src/lib/research-os/marketing", f)),
  ];
  for (const f of ts) {
    const src = readFileSync(f, "utf8");
    assert.ok(!/\bfetch\(|from "node:(http|https|net|dgram|tls)"|axios|XMLHttpRequest/.test(src), f);
  }
  const pyDir = join(ROOT, "packages/bkt/analyze/marketing");
  for (const f of readdirSync(pyDir).filter((x) => x.endsWith(".py"))) {
    const src = readFileSync(join(pyDir, f), "utf8");
    assert.ok(!/^\s*(import|from)\s+(socket|http|urllib\.request|requests|ftplib|smtplib)\b/m.test(src), f);
  }
});

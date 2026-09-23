import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.join(__dirname, "..", "..", "..");
const OUT = path.join(__dirname, "out");
const STUB = path.join(__dirname, "fixtures", "ingest-stubs.ts");
const GENERATED = ["academy-preview.json", "canon-preview.json", "review-list.json"];
const DB_ENV = { NEXT_PUBLIC_SUPABASE_URL: "http://supabase.test", SUPABASE_SERVICE_ROLE_KEY: "service-key" };
const GOLD_TABLES = new Set(["nodes", "edges"]);

type Call = { op: string; table?: string; sha?: string; args?: unknown; kinds?: Record<string, number> };
type Run = { status: number | null; stdout: string; stderr: string; calls: Call[] };

function snapshot(): Map<string, string | null> {
  return new Map(GENERATED.map((f) => {
    const p = path.join(OUT, f);
    return [f, fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null];
  }));
}

function restore(saved: Map<string, string | null>): void {
  for (const [f, body] of Array.from(saved.entries())) {
    const p = path.join(OUT, f);
    if (body === null) fs.rmSync(p, { force: true });
    else fs.writeFileSync(p, body);
  }
}

function run(script: string, args: string[], extraEnv: Record<string, string>): Run {
  const log = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ingest-shadow-")), "calls.json");
  const env: NodeJS.ProcessEnv = { ...process.env, ...DB_ENV, STUB_KNOWN_SLUGS: "1", ...extraEnv, STUB_LOG: log, TS_NODE_BASEURL: "./" };
  const r = spawnSync(
    process.execPath,
    [
      path.join(ROOT, "node_modules/ts-node/dist/bin.js"),
      "-r",
      "tsconfig-paths/register",
      "--compiler-options",
      JSON.stringify({ module: "commonjs", baseUrl: "." }),
      "-r",
      STUB,
      path.join(__dirname, script),
      ...args,
    ],
    { cwd: ROOT, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  const calls = fs.existsSync(log) ? (JSON.parse(fs.readFileSync(log, "utf8")) as Call[]) : [];
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, calls };
}

function goldWrites(calls: Call[]): string[] {
  return calls.filter((c) => c.op === "upsert" && GOLD_TABLES.has(c.table ?? "")).map((c) => `${c.table}:${c.sha}`);
}

for (const script of ["academy-import.ts", "canon-import.ts", "canon-all.ts", "intake-all.ts"]) {
  test(`${script}: a failed shadow write leaves gold written and the exit code unchanged`, () => {
    const saved = snapshot();
    try {
      const plain = run(script, ["--apply"], {});
      const shadowed = run(script, ["--apply", "--medallion"], { STUB_FAIL: "rpc:admit_bronze_sources" });

      assert.equal(plain.status, 0, plain.stderr);
      assert.equal(shadowed.status, plain.status, shadowed.stderr);
      const gold = goldWrites(plain.calls);
      assert.ok(gold.length > 0, "the plain run wrote no gold");
      assert.deepEqual(goldWrites(shadowed.calls), gold);

      const admitAt = shadowed.calls.findIndex((c) => c.op === "rpc" && c.args === "admit_bronze_sources");
      assert.ok(admitAt >= 0, "the shadow leg never ran");
      const lastGold = shadowed.calls.reduce((at, c, i) => (c.op === "upsert" && GOLD_TABLES.has(c.table ?? "") ? i : at), -1);
      assert.ok(lastGold < admitAt, "the shadow leg ran before the gold write finished");
      assert.equal(shadowed.calls.filter((c) => c.op === "upsert" && c.table === "silver_items").length, 0);

      assert.match(shadowed.stderr, /medallion shadow FAILED: bronze admission failed: rpc stub failure/);
      assert.match(shadowed.stdout, /medallion shadow failures: 1/);
      assert.match(plain.stdout, /medallion shadow failures: 0/);
    } finally {
      restore(saved);
    }
  });
}

test("a shadow write with no database settings reports a failure and exits zero", () => {
  const saved = snapshot();
  try {
    const r = run("academy-import.ts", ["--medallion"], { NEXT_PUBLIC_SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "" });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stderr, /medallion shadow FAILED/);
    assert.match(r.stdout, /medallion shadow failures: 1/);
  } finally {
    restore(saved);
  }
});

function factorWrites(calls: Call[]): number {
  return calls.filter((c) => c.op === "upsert" && c.table === "edges").reduce((n, c) => n + (c.kinds?.derives_from ?? 0) + (c.kinds?.prerequisite ?? 0), 0);
}

for (const script of ["canon-all.ts", "intake-all.ts"]) {
  test(`${script}: factor edges go to review, and --no-medallion writes them directly`, () => {
    const saved = snapshot();
    try {
      const staged = run(script, ["--apply"], {});
      const direct = run(script, ["--apply", "--no-medallion"], {});
      assert.equal(staged.status, 0, staged.stderr);
      assert.equal(direct.status, 0, direct.stderr);
      assert.equal(factorWrites(staged.calls), 0);
      assert.ok(factorWrites(direct.calls) > 0, "the opt-out wrote no factor edges");
      const proposals = staged.calls.filter((c) => c.op === "upsert" && c.table === "edge_proposals");
      assert.ok(proposals.length > 0, "no edge proposals were written");
      assert.match(staged.stdout, /medallion split: \d+ gold nodes, 0 new nodes to review, \d+ direct edges, [1-9]\d* factor edges to review/);
      assert.ok(!direct.calls.some((c) => c.op === "rpc" && c.args === "admit_bronze_sources"));
    } finally {
      restore(saved);
    }
  });
}

test("canon-all sends nodes absent from gold to the node review", () => {
  const saved = snapshot();
  try {
    const r = run("canon-all.ts", ["--apply"], { STUB_KNOWN_SLUGS: "0" });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.calls.filter((c) => c.op === "upsert" && c.table === "nodes").length, 0);
    assert.ok(r.calls.some((c) => c.op === "upsert" && c.table === "node_proposals"));
    assert.match(r.stdout, /medallion split: 0 gold nodes, [1-9]\d* new nodes to review/);
  } finally {
    restore(saved);
  }
});

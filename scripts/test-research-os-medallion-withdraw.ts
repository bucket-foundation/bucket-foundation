import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseWithdrawArgs, withdrawalImpact } from "../src/lib/research-os/medallion/withdrawal";
import { lineageSummary } from "../src/lib/research-os/medallion/report";
import { readLineageBlock } from "../src/lib/research-os/primes-report";
import { decompose } from "../src/lib/research-os/primes";

const ROOT = path.join(__dirname, "..");
const STUB = path.join(__dirname, "research-os", "medallion", "fixtures", "withdraw-stub.ts");
const A = `file:${"a".repeat(64)}`;
const B = `file:${"b".repeat(64)}`;
const C = `file:${"c".repeat(64)}`;
const PATH = "bucket-canon/05-biophysics/sub-claims/emf/001-x.md";

test("the runner's arguments name one target, a reason, and file ids only", () => {
  assert.deepEqual(parseWithdrawArgs([`--source=${A}`, "--reason=author asked"]), { ok: true, args: { mode: "withdraw", target: { source: A }, reason: "author asked", apply: false } });
  assert.deepEqual(parseWithdrawArgs([`--path=${PATH}`, "--reason=r", "--apply"]), { ok: true, args: { mode: "withdraw", target: { path: PATH }, reason: "r", apply: true } });
  assert.deepEqual(parseWithdrawArgs([`--source=${A}`]), { ok: false, error: "no_reason" });
  assert.deepEqual(parseWithdrawArgs([`--source=${A}`, "--reason=  "]), { ok: false, error: "no_reason" });
  assert.deepEqual(parseWithdrawArgs(["--reason=r"]), { ok: false, error: "no_target" });
  assert.deepEqual(parseWithdrawArgs([`--source=${A}`, `--path=${PATH}`, "--reason=r"]), { ok: false, error: "two_targets" });
  assert.deepEqual(parseWithdrawArgs(["--source=doi:10.1000/x", "--reason=r"]), { ok: false, error: "bad_source" });
  assert.deepEqual(parseWithdrawArgs(["--path=/srv/abs/_intake/a.md", "--reason=r"]), { ok: false, error: "bad_path" });
  assert.deepEqual(parseWithdrawArgs(["--queue"]), { ok: true, args: { mode: "queue" } });
  assert.deepEqual(parseWithdrawArgs(["--restore=claim-x"]), { ok: false, error: "no_reviewer" });
  assert.deepEqual(parseWithdrawArgs([`--restore-history=${A}`, "--reviewer=r@x.example", "--apply"]), { ok: true, args: { mode: "restore-history", source: A, reviewer: "r@x.example", apply: true } });
  assert.deepEqual(parseWithdrawArgs([`--restore-history=${A}`]), { ok: false, error: "no_reviewer" });
  assert.deepEqual(parseWithdrawArgs(["--restore-history=doi:10.1000/x", "--reviewer=r@x.example"]), { ok: false, error: "bad_source" });
});

test("a node goes private only when every source it has is withdrawn", () => {
  const impact = withdrawalImpact({
    sourceIds: new Set([A, B]),
    silver: [
      { id: "s1", source_id: A, status: "promoted" },
      { id: "s2", source_id: B, status: "withdrawn" },
    ],
    lineage: [
      { node_id: "n1", silver_item_id: "s1" },
      { node_id: "n2", silver_item_id: "s1" },
      { node_id: "n2", silver_item_id: "s3" },
      { node_id: "n3", silver_item_id: "s2" },
      { node_id: "n3", silver_item_id: "s4" },
      { node_id: "n4", silver_item_id: "s5" },
    ],
    otherSilverStatus: new Map([
      ["s3", { source_id: C, status: "promoted" }],
      ["s4", { source_id: C, status: "withdrawn" }],
      ["s5", { source_id: C, status: "promoted" }],
    ]),
  });
  assert.deepEqual(impact, { silverToWithdraw: ["s1"], orphaned: ["n1", "n3"], kept: ["n2"] });
});

const nodes = [
  { id: "t1", slug: "canon-02-physics-heisenberg", createdAt: "2026-09-20T00:00:00Z", provenanceType: "canon_concept" },
  { id: "x1", slug: "claim-1", createdAt: "2026-09-20T00:00:00Z", provenanceType: "source_excerpt" },
  { id: "a1", slug: "academy-a", createdAt: "2026-09-20T00:00:00Z", provenanceType: "academy_atom" },
  { id: "a0", slug: "academy-b", createdAt: "2026-09-20T00:00:00Z", provenanceType: "academy_atom" },
  { id: "o1", slug: "old", createdAt: "2026-09-20T00:00:00Z", provenanceType: "production" },
  { id: "n1", slug: "new", createdAt: "2026-09-25T00:00:00Z", provenanceType: "production" },
];

test("the lineage block counts sources, open nodes on each side of the backfill, and transcript nodes on a path", () => {
  const dec = decompose(
    nodes.map((n) => ({ id: n.id, slug: n.slug, title: n.slug, kind: "concept", branch: "02-physics" })),
    [
      { fromId: "t1", toId: "a1", kind: "derives_from", confidence: 0.7 },
      { fromId: "a0", toId: "a1", kind: "prerequisite", confidence: 1 },
    ],
  );
  const s = lineageSummary({
    nodes,
    lineage: [
      { node_id: "t1", silver_item_id: "st", promoted_by: "backfill", promoted_at: "2026-09-23T16:35:00Z" },
      { node_id: "x1", silver_item_id: "sx", promoted_by: "backfill", promoted_at: "2026-09-23T16:35:01Z" },
      { node_id: "a1", silver_item_id: "sa", promoted_by: "backfill", promoted_at: "2026-09-23T16:35:02Z" },
      { node_id: "a1", silver_item_id: "sa2", promoted_by: "importer", promoted_at: "2026-09-23T17:00:00Z" },
      { node_id: "a0", silver_item_id: "sa2", promoted_by: "reviewer", promoted_at: "2026-09-24T00:00:00Z" },
    ],
    silverSource: new Map([
      ["st", A],
      ["sx", B],
      ["sa", C],
      ["sa2", C],
    ]),
    pathsBySource: new Map([
      [A, ["bucket-canon/02-physics/sub-claims/heisenberg/"]],
      [B, [PATH]],
      [C, ["learning/app/corpus/02-physics.json"]],
    ]),
    decomposition: dec,
    pending: [{ action: "demote" }, { action: "demote" }, { action: "add" }],
    withdrawnQueue: 1,
  });
  assert.deepEqual(s.byPromotedBy, { backfill: 3, importer: 1, reviewer: 1 });
  assert.deepEqual(s.none, { beforeStage2: 1, afterStage2: 1 });
  assert.equal(s.stage2Since, "2026-09-23T16:35:00Z");
  assert.equal(s.transcript.nodes, 2);
  assert.equal(s.transcript.onDependencyPath, 1);
  assert.equal(s.transcript.deepest, 2);
  assert.deepEqual(s.transcript.byType.canon_concept, { nodes: 1, onDependencyPath: 1, deepest: 2 });
  assert.deepEqual(s.transcript.byType.source_excerpt, { nodes: 1, onDependencyPath: 0, deepest: 0 });
  assert.deepEqual(s.transcript.deepestNodes, [{ slug: "canon-02-physics-heisenberg", depth: 2 }]);
  assert.deepEqual(s.review, { addPending: 1, demotePending: 2, withdrawnQueue: 1 });
  assert.ok(!JSON.stringify(s).includes("bucket-canon"), "the block carries no path");
});

test("an empty graph gives an empty lineage block", () => {
  const s = lineageSummary({ nodes: [], lineage: [], silverSource: new Map(), pathsBySource: new Map(), decomposition: new Map(), pending: [], withdrawnQueue: 0 });
  assert.deepEqual(s, {
    nodes: 0,
    byPromotedBy: { backfill: 0, importer: 0, reviewer: 0 },
    none: { beforeStage2: 0, afterStage2: 0 },
    stage2Since: null,
    transcript: { nodes: 0, onDependencyPath: 0, deepest: 0, byType: {}, deepestNodes: [] },
    review: { addPending: 0, demotePending: 0, withdrawnQueue: 0 },
  });
});

test("a lineage read that fails leaves the rest of the report and says so", async () => {
  const failing = { from: () => { throw new Error("relation graph.gold_lineage does not exist"); } };
  const block = await readLineageBlock(failing as never, [], []);
  assert.equal(block.ok, false);
  assert.match((block as { unavailable: string }).unavailable, /gold_lineage/);
});

function runRunner(args: string[], tables: Record<string, unknown[]>, env: Record<string, string> = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "withdraw-"));
  const tablesFile = path.join(dir, "tables.json");
  const log = path.join(dir, "calls.json");
  fs.writeFileSync(tablesFile, JSON.stringify(tables));
  const r = spawnSync(
    process.execPath,
    [path.join(ROOT, "node_modules/ts-node/dist/bin.js"), "--compiler-options", JSON.stringify({ module: "commonjs" }), "-r", STUB, path.join(ROOT, "scripts/research-os/medallion/withdraw.ts"), ...args],
    {
      cwd: ROOT,
      env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "http://supabase.test", SUPABASE_SERVICE_ROLE_KEY: "k", STUB_TABLES: tablesFile, STUB_LOG: log, ...env },
      encoding: "utf8",
    },
  );
  const calls = fs.existsSync(log) ? (JSON.parse(fs.readFileSync(log, "utf8")) as { op: string; args?: { name?: string; args?: unknown } }[]) : [];
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, rpcs: calls.filter((c) => c.op === "rpc").map((c) => c.args) };
}

const TABLES = {
  bronze_file_paths: [
    { source_id: A, source_revision: "r1", repo_path: PATH },
    { source_id: B, source_revision: "r2", repo_path: PATH },
    { source_id: C, source_revision: "r3", repo_path: "learning/app/corpus/02-physics.json" },
  ],
  evidence_source_admissions: [
    { source_id: A, source_revision: "r1", status: "superseded" },
    { source_id: B, source_revision: "r2", status: "active" },
    { source_id: C, source_revision: "r3", status: "active" },
  ],
  silver_items: [
    { id: "s1", source_id: A, status: "promoted" },
    { id: "s2", source_id: B, status: "promoted" },
    { id: "s3", source_id: C, status: "promoted" },
  ],
  gold_lineage: [
    { id: "l1", node_id: "n-claim", silver_item_id: "s1" },
    { id: "l2", node_id: "n-claim", silver_item_id: "s2" },
    { id: "l3", node_id: "n-atom", silver_item_id: "s2" },
    { id: "l4", node_id: "n-atom", silver_item_id: "s3" },
  ],
  nodes: [
    { id: "n-claim", slug: "claim-emf-001" },
    { id: "n-atom", slug: "academy-emf" },
  ],
  medallion_withdrawn_nodes: [{ node_id: "n-claim", source_id: B, withdrawn_at: "2026-09-24T00:00:00Z", reviewed_at: null }],
  factoids: [
    { id: "f1", silver_item_id: "s1", status: "active" },
    { id: "f2", silver_item_id: "s3", status: "active" },
  ],
  places: [{ id: "p1", source_id: B, status: "active" }],
  periods: [],
  users: [{ id: "u-founder", email: "founder@bucket.example" }],
};

test("a dry run by path finds every revision the path held, lists what would change, and writes nothing", () => {
  const r = runRunner([`--path=${PATH}`, "--reason=author asked"], TABLES);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, new RegExp(`2 source\\(s\\): ${A}, ${B}`));
  assert.match(r.stdout, /2 silver item\(s\) go withdrawn; 1 gold node\(s\) go private; 1 keep another source/);
  assert.match(r.stdout, /private\tclaim-emf-001/);
  assert.match(r.stdout, /kept\tacademy-emf/);
  assert.match(r.stdout, /1 history factoid\(s\), 1 place\(s\) and 0 period\(s\) go withdrawn/);
  assert.match(r.stdout, /dry run, nothing written/);
  assert.deepEqual(r.rpcs, []);
  assert.ok(!r.stdout.includes(PATH) && !r.stderr.includes(PATH), "the runner printed the repo path");
});

test("apply withdraws once per source id", () => {
  const r = runRunner([`--path=${PATH}`, "--reason=author asked", "--apply"], TABLES);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.rpcs, [
    { name: "withdraw_evidence_source", args: { p_source_id: A, p_reason: "author asked" } },
    { name: "withdraw_evidence_source", args: { p_source_id: B, p_reason: "author asked" } },
  ]);
});

test("a missing reason, an unknown path and a reviewer off the list exit 1 and write nothing", () => {
  const noReason = runRunner([`--path=${PATH}`], TABLES);
  assert.equal(noReason.status, 1);
  assert.match(noReason.stderr, /no_reason/);
  const unknown = runRunner(["--path=_intake/none.md", "--reason=r"], TABLES);
  assert.equal(unknown.status, 1);
  const outsider = runRunner(["--restore=claim-emf-001", "--reviewer=someone@else.example", "--apply"], TABLES, { RESEARCH_OS_REVIEWER_EMAILS: "founder@bucket.example" });
  assert.equal(outsider.status, 1);
  for (const r of [noReason, unknown, outsider]) assert.deepEqual(r.rpcs, []);
});

test("the queue lists withdrawn nodes, and a listed reviewer restores through the database function", () => {
  const q = runRunner(["--queue"], TABLES);
  assert.equal(q.status, 0, q.stderr);
  assert.match(q.stdout, new RegExp(`claim-emf-001\t${B}`));
  const r = runRunner(["--restore=claim-emf-001", "--reviewer=Founder@Bucket.example", "--apply"], TABLES, { RESEARCH_OS_REVIEWER_EMAILS: "founder@bucket.example" });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.rpcs, [{ name: "restore_withdrawn_node", args: { p_node: "n-claim", p_reviewer: "u-founder" } }]);
});

test("a listed reviewer revives a history source through restore_withdrawn_history, and an outsider cannot", () => {
  const env = { RESEARCH_OS_REVIEWER_EMAILS: "founder@bucket.example" };
  const outsider = runRunner([`--restore-history=${B}`, "--reviewer=someone@else.example", "--apply"], TABLES, env);
  assert.equal(outsider.status, 1);
  assert.deepEqual(outsider.rpcs, []);
  const dry = runRunner([`--restore-history=${B}`, "--reviewer=founder@bucket.example"], TABLES, env);
  assert.equal(dry.status, 0, dry.stderr);
  assert.deepEqual(dry.rpcs, []);
  const r = runRunner([`--restore-history=${B}`, "--reviewer=founder@bucket.example", "--apply"], TABLES, env);
  assert.deepEqual(r.rpcs, [{ name: "restore_withdrawn_history", args: { p_source: B, p_reviewer: "u-founder" } }]);
});

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  addRandomPairs,
  approvalBySource,
  buildLinkPrompt,
  mergeProposals,
  parseLinkAnswer,
  planWrites,
  primeText,
  topCosine,
  wilson,
  MAX_MODEL_PICKS,
  type LinkProposal,
} from "../src/lib/research-os/nsm-links";
import { sql, loadLocalEnv, openLaunchScope } from "./lib/test-harness";

openLaunchScope();

loadLocalEnv();

const node = { id: "n1", slug: "conservation-of-energy", title: "Conservation of energy", summary: "Energy stays the same over time.", branch: "02-physics" };

test("cosine keeps the top three with ranks", () => {
  const vecs = new Map([["a", [1, 0]], ["b", [0.8, 0.6]], ["c", [0, 1]], ["d", [-1, 0]]]);
  const hits = topCosine([1, 0], vecs);
  assert.deepEqual(hits.map((h) => [h.primeId, h.rank]), [["a", 1], ["b", 2], ["c", 3]]);
  assert.equal(hits[1].cosine, 0.8);
});

test("a prime named by cosine and the model is marked both, and keeps the cosine", () => {
  const rows = mergeProposals("n1", [{ primeId: "the_same", cosine: 0.7, rank: 1 }, { primeId: "time", cosine: 0.6, rank: 2 }], [{ primeId: "the_same", why: "stays the same" }, { primeId: "before", why: "earlier state" }], { model: "claude-sonnet-x", promptHash: "h" });
  const by = new Map(rows.map((r) => [r.prime_id, r]));
  assert.equal(by.get("the_same")!.source, "both");
  assert.equal(by.get("the_same")!.cosine, 0.7);
  assert.equal(by.get("the_same")!.rationale, "stays the same");
  assert.equal(by.get("time")!.source, "cosine");
  assert.equal(by.get("time")!.model, null);
  assert.equal(by.get("before")!.source, "model");
  assert.equal(by.get("before")!.model, "claude-sonnet-x");
});

test("the model reply keeps known ids once, and refuses what it cannot read", () => {
  const allowed = new Set(["the_same", "before", "after"]);
  const text = JSON.stringify({ primes: [{ id: "the_same", why: "a" }, { id: "mine", why: "b" }, { id: "the_same", why: "c" }, { id: " before ", why: "d" }, { id: 3, why: "e" }] });
  assert.deepEqual(parseLinkAnswer(`noise ${text} noise`, allowed), [{ primeId: "the_same", why: "a" }, { primeId: "before", why: "d" }]);
  assert.deepEqual(parseLinkAnswer("no json", allowed), { error: "unparseable" });
  assert.deepEqual(parseLinkAnswer("{\"x\": 1}", allowed), { error: "no_primes_array" });
  const many = JSON.stringify({ primes: Array.from({ length: 20 }, (_, i) => ({ id: `p${i}`, why: "w" })) });
  const wide = new Set(Array.from({ length: 20 }, (_, i) => `p${i}`));
  assert.equal((parseLinkAnswer(many, wide) as unknown[]).length, MAX_MODEL_PICKS);
});

test("the prompt lists every prime and the idea", () => {
  const prompt = buildLinkPrompt(node, [{ id: "the_same", label: "THE SAME", english: ["the same"], sense: "identical" }]);
  assert.match(prompt, /the_same \| THE SAME/);
  assert.match(prompt, /Conservation of energy \(02-physics\)/);
  assert.equal(primeText({ id: "other", label: "OTHER~ELSE", english: ["other", "else"], sense: null }), "other, else. other, else");
});

const real = (n: string, p: string): LinkProposal => ({ node_id: n, prime_id: p, source: "cosine", cosine: 0.5, rank: 1, rationale: null, model: null, prompt_hash: null });

test("random pairs come one per five, never repeat a real or held pair, and are seeded", () => {
  const props = Array.from({ length: 10 }, (_, i) => real("n1", `p${i}`));
  const nodes = ["n1", "n2"];
  const primes = Array.from({ length: 12 }, (_, i) => `p${i}`);
  const taken = new Set(["n2|p0"]);
  const a = addRandomPairs(props, nodes, primes, taken, "s");
  const b = addRandomPairs(props, nodes, primes, taken, "s");
  assert.equal(a.length, 2);
  assert.deepEqual(a, b);
  for (const r of a) {
    assert.equal(r.source, "random");
    assert.ok(!props.some((p) => p.node_id === r.node_id && p.prime_id === r.prime_id));
    assert.ok(!taken.has(`${r.node_id}|${r.prime_id}`));
  }
  assert.equal(addRandomPairs(props, nodes, primes, taken, "s", { held: 2 }).length, 0);
  assert.equal(addRandomPairs(props.slice(0, 4), nodes, primes, taken, "s").length, 0);
});

test("a rerun inserts new pairs, refreshes waiting ones and keeps decided ones", () => {
  const plan = planWrites([real("n1", "a"), real("n1", "b"), real("n1", "c")], [
    { id: "1", node_id: "n1", prime_id: "b", status: "proposed" },
    { id: "2", node_id: "n1", prime_id: "c", status: "approved" },
  ]);
  assert.deepEqual(plan.insert.map((p) => p.prime_id), ["a"]);
  assert.deepEqual(plan.refresh.map((p) => [p.id, p.prime_id]), [["1", "b"]]);
  assert.equal(plan.kept, 1);
});

test("approval by source counts decided rows only, with a Wilson interval", () => {
  const w = wilson(8, 10);
  assert.ok(w.low > 0.44 && w.low < 0.5 && w.high > 0.94 && w.high < 0.95);
  assert.deepEqual(wilson(0, 0), { n: 0, k: 0, rate: 0, low: 0, high: 0 });
  const by = approvalBySource([
    { source: "cosine", status: "approved" },
    { source: "cosine", status: "rejected" },
    { source: "cosine", status: "proposed" },
    { source: "random", status: "rejected" },
  ]);
  assert.deepEqual([by.cosine.n, by.cosine.k, by.random.n, by.random.k, by.model.n], [2, 1, 1, 0, 0]);
});

const probe = sql("select to_regclass('graph.nsm_links') is not null and (select count(*) from graph.nsm_primes) > 0");
const ready = probe.status === 0 && probe.out === "t" && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
if (process.env.RESEARCH_OS_REQUIRE_DB === "1" && !ready) throw new Error(`RESEARCH_OS_REQUIRE_DB=1 and the local stack has no graph.nsm_links: ${probe.out}`);
const skip = ready ? false : "no local stack with graph.nsm_links and the NSM primes";

function fixture(): { publicNode: string; privateNode: string; approved: string; waiting: string; hidden: string; cleanup: () => void } {
  const tag = `nsmlinks-${Date.now().toString(36)}`;
  const publicNode = randomUUID();
  const privateNode = randomUUID();
  const approved = randomUUID();
  const waiting = `00000000-0000-4000-8000-${randomUUID().slice(-12)}`;
  const hidden = randomUUID();
  const r = sql(`
    insert into graph.nodes (id, slug, title, kind, tier, branch, summary, visibility) values
      ('${publicNode}', '${tag}-pub', 'Pub', 'concept', 0, '02-physics', 's', 'public'),
      ('${privateNode}', '${tag}-priv', 'Priv', 'concept', 0, '02-physics', 's', 'private');
    insert into graph.nsm_links (id, node_id, prime_id, source, status, run_id, decided_at) values
      ('${approved}', '${publicNode}', 'the_same', 'cosine', 'approved', 't', now()),
      ('${waiting}', '${publicNode}', 'before', 'model', 'proposed', 't', null),
      ('${hidden}', '${privateNode}', 'after', 'both', 'approved', 't', now());`);
  assert.equal(r.status, 0, r.out);
  return { publicNode, privateNode, approved, waiting, hidden, cleanup: () => void sql(`delete from graph.nodes where id in ('${publicNode}', '${privateNode}')`) };
}

test("anon and authenticated read approved links on public nodes only, and write nothing", { skip }, () => {
  const f = fixture();
  try {
    for (const role of ["anon", "authenticated"]) {
      const read = sql(`begin; grant usage on schema graph to ${role}; set local role ${role};
        select string_agg(id::text, ',' order by id) from graph.nsm_links where id in ('${f.approved}', '${f.waiting}', '${f.hidden}'); rollback;`);
      assert.equal(read.status, 0, read.out);
      assert.match(read.out, new RegExp(`^${f.approved}$`, "m"), `${role}: ${read.out}`);
      for (const write of [
        `insert into graph.nsm_links (node_id, prime_id, source, run_id) values ('${f.publicNode}', 'after', 'cosine', 'x')`,
        `update graph.nsm_links set status = 'approved', decided_at = now() where id = '${f.waiting}'`,
        `delete from graph.nsm_links where id = '${f.approved}'`,
      ]) {
        const w = sql(`begin; grant usage on schema graph to ${role}; set local role ${role}; ${write}; rollback;`);
        assert.notEqual(w.status, 0, `${role} wrote: ${write}`);
        assert.match(w.out, /permission denied|row-level security/, w.out);
      }
    }
  } finally {
    f.cleanup();
  }
});

test("a decided row needs its decision time, and a waiting row has none", { skip }, () => {
  const f = fixture();
  try {
    const r = sql(`update graph.nsm_links set status = 'approved' where id = '${f.waiting}'`);
    assert.notEqual(r.status, 0);
    assert.match(r.out, /check constraint/);
  } finally {
    f.cleanup();
  }
});

test("a decision is claimed once, and the queue hides where a pair came from", { skip }, async () => {
  const f = fixture();
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const { decideNsmLink, listNsmLinkProposals } = await import("../src/lib/research-os/inference/nsm-link-actions");
    const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "graph" }, auth: { persistSession: false } });
    const queue = await listNsmLinkProposals(svc as never);
    assert.equal(queue.status, 200);
    const mine = (queue.body.proposals as Record<string, unknown>[]).find((p) => p.id === f.waiting);
    assert.ok(mine, "the waiting pair is in the queue");
    assert.deepEqual(Object.keys(mine!).sort(), ["id", "node", "prime"]);
    assert.ok(!(queue.body.proposals as { id: string }[]).some((p) => p.id === f.approved));
    const reviewer = sql("select id from auth.users order by created_at limit 1").out;
    const first = await decideNsmLink(svc as never, { id: f.waiting, decision: "approved", reason: "uses before", reviewerId: reviewer || randomUUID() });
    assert.deepEqual(first.body, { decision: "approved" });
    const second = await decideNsmLink(svc as never, { id: f.waiting, decision: "rejected", reason: null, reviewerId: reviewer || randomUUID() });
    assert.deepEqual(second.body, { alreadyDecided: true, decision: "approved" });
    assert.equal((await decideNsmLink(svc as never, { id: randomUUID(), decision: "approved", reason: null, reviewerId: randomUUID() })).status, 404);
  } finally {
    f.cleanup();
  }
});

test("the review route refuses a caller who is not a graph reviewer", { skip }, async () => {
  const { GET, POST } = await import("../src/app/api/research-os/nsm-links/route");
  const { NextRequest } = await import("next/server");
  const get = await GET(new NextRequest("http://localhost/api/research-os/nsm-links"), undefined);
  assert.equal(get.status, 403);
  const post = await POST(new NextRequest("http://localhost/api/research-os/nsm-links", { method: "POST", body: JSON.stringify({ id: randomUUID(), decision: "approved" }) }), undefined);
  assert.equal(post.status, 403);
});

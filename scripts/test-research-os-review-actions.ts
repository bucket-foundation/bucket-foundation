/**
 * The review actions behind /api/research-os/edges and node-proposals,
 * run against an in-memory stand-in for the Supabase client: ordering,
 * the edge kind, the cycle guard, claims, releases on a failed write, and
 * missing-prime approval.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { decideEdge, decideNode, listEdgeProposals, listNodeProposals, priorityOf } from "../src/lib/research-os/inference/review-actions";

type Row = Record<string, any>;
type Db = Record<string, Row[]>;
type Rpc = (args: any) => { data: unknown; error: { message: string } | null };

let nextId = 1;
const newId = () => `id-${nextId++}`;

/** The query chains review-actions uses, over plain arrays. `fail` names "table:op" pairs that error. */
function fake(db: Db, rpcs: Record<string, Rpc>, fail: Set<string> = new Set(), calls: string[] = []) {
  class Q {
    op: "select" | "update" | "delete" | "insert" | "upsert" = "select";
    filters: ((r: Row) => boolean)[] = [];
    patch?: Row;
    rows?: Row[];
    opts?: { onConflict?: string; ignoreDuplicates?: boolean };
    from0?: number;
    to0?: number;
    one?: "maybe" | "single";
    returning = false;
    constructor(private table: string) {}
    select() {
      if (this.op !== "select") this.returning = true;
      return this;
    }
    eq(c: string, v: unknown) {
      this.filters.push((r) => r[c] === v);
      return this;
    }
    in(c: string, vs: unknown[]) {
      this.filters.push((r) => vs.includes(r[c]));
      return this;
    }
    is(c: string, v: unknown) {
      this.filters.push((r) => (r[c] ?? null) === v);
      return this;
    }
    order() {
      return this;
    }
    limit(n: number) {
      this.from0 = 0;
      this.to0 = n - 1;
      return this;
    }
    range(a: number, b: number) {
      this.from0 = a;
      this.to0 = b;
      return this;
    }
    update(p: Row) {
      this.op = "update";
      this.patch = p;
      return this;
    }
    delete() {
      this.op = "delete";
      return this;
    }
    insert(rows: Row[]) {
      this.op = "insert";
      this.rows = rows;
      return this;
    }
    upsert(rows: Row[], opts: { onConflict?: string; ignoreDuplicates?: boolean }) {
      this.op = "upsert";
      this.rows = rows;
      this.opts = opts;
      return this;
    }
    maybeSingle() {
      this.one = "maybe";
      return this;
    }
    single() {
      this.one = "single";
      return this;
    }
    run(): { data: unknown; error: { message: string } | null } {
      calls.push(`${this.table}:${this.op}`);
      if (fail.has(`${this.table}:${this.op}`)) return { data: null, error: { message: "injected failure" } };
      const t = (db[this.table] ??= []);
      const match = (r: Row) => this.filters.every((f) => f(r));
      let data: Row[] | null = null;
      if (this.op === "select") {
        data = t.filter(match);
        if (this.from0 !== undefined) data = data.slice(this.from0, (this.to0 ?? data.length) + 1);
      } else if (this.op === "update") {
        const hit = t.filter(match);
        hit.forEach((r) => Object.assign(r, this.patch));
        data = this.returning ? hit.map((r) => ({ id: r.id })) : null;
      } else if (this.op === "delete") {
        for (const r of t.filter(match)) t.splice(t.indexOf(r), 1);
      } else if (this.op === "insert") {
        const added = this.rows!.map((r) => ({ id: newId(), ...r }));
        t.push(...added);
        data = this.returning ? added : null;
      } else {
        const keys = (this.opts?.onConflict ?? "id").split(",");
        for (const r of this.rows!) {
          const existing = t.find((x) => keys.every((k) => x[k] === r[k]));
          if (existing) {
            if (!this.opts?.ignoreDuplicates) Object.assign(existing, r);
          } else t.push({ id: newId(), ...r });
        }
      }
      if (this.one) {
        const first = (data ?? [])[0] ?? null;
        if (this.one === "single" && !first) return { data: null, error: { message: "no rows" } };
        return { data: first, error: null };
      }
      return { data, error: null };
    }
    then<A, B>(res: (v: { data: unknown; error: { message: string } | null }) => A, rej?: (e: unknown) => B) {
      return Promise.resolve(this.run()).then(res, rej);
    }
  }
  return {
    from: (table: string) => new Q(table),
    rpc: (fn: string, args: unknown) => {
      calls.push(`rpc:${fn}`);
      if (!rpcs[fn]) throw new Error(`unexpected rpc ${fn}`);
      return Promise.resolve(rpcs[fn](args));
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function seed(): Db {
  return {
    nodes: [
      { id: "n-kin", slug: "kinematics", title: "Kinematics", branch: "02-physics", tier: 14, summary: "Describing motion." },
      { id: "n-der", slug: "derivatives", title: "Derivatives", branch: "01-mathematics", tier: 15, summary: "Rates of change." },
      { id: "n-set", slug: "sets", title: "Sets and functions", branch: "01-mathematics", tier: 13, summary: "Collections." },
    ],
    edges: [],
    prereq_ancestor: [],
    edge_proposals: [
      {
        id: "p-conf",
        from_slug: "derivatives",
        to_slug: "kinematics",
        branch: "02-physics",
        status: "pending",
        confidence: 0.65,
        confidence_source: "prime_decompose_llm",
        agreement: true,
        verification: "confirmed",
        origin: "proposer",
        refd: null,
        justification: "Velocity is a derivative.",
        secondary_justification: "opus: yes",
        model: "sonnet",
        prompt_hash: "h1",
        created_at: "2026-09-18T00:00:00Z",
        impact: 0,
        cross_branch: true,
      },
      {
        id: "p-ref",
        from_slug: "sets",
        to_slug: "kinematics",
        branch: "02-physics",
        status: "pending",
        confidence: 0.4,
        confidence_source: "prime_decompose_llm",
        agreement: false,
        verification: "refuted",
        origin: "proposer",
        refd: null,
        justification: "Motion maps time to position.",
        secondary_justification: "opus: only related",
        model: "sonnet",
        prompt_hash: "h1",
        created_at: "2026-09-18T00:00:01Z",
        impact: 0,
        cross_branch: true,
      },
    ],
    node_proposals: [
      {
        id: "np-eq",
        key: "equality",
        title: "Equality",
        branch: "01-mathematics",
        justification: "Both sides name one value.",
        summary: "Two expressions are equal when they name the same value.",
        named_by: ["kinematics", "sets", "gone"],
        aliases: ["Equality / equivalence"],
        reasons: { kinematics: "Position equals the integral of velocity." },
        possible_duplicates: [],
        base_match: "THE SAME (equality)",
        model: "sonnet",
        status: "pending",
        created_at: "2026-09-18T00:00:00Z",
      },
    ],
  };
}

const rpcs = (restsOn = false): Record<string, Rpc> => ({
  idea_dependents: (a: { p_slugs: string[] }) => ({ data: a.p_slugs.map((s) => ({ slug: s, dependents: s === "kinematics" ? 52 : 0 })), error: null }),
  rests_on: () => ({ data: restsOn, error: null }),
  replace_prereq_ancestor: () => ({ data: 0, error: null }),
});

test("priority weighs uncertainty by the decompositions a pair reaches", () => {
  assert.ok(priorityOf({ verification: "refuted", agreement: false }, 52) > priorityOf({ verification: "confirmed", agreement: true }, 52));
  assert.ok(priorityOf({ verification: "confirmed", agreement: true }, 52) > priorityOf({ verification: "refuted", agreement: false }, 0));
  assert.equal(priorityOf({ verification: null, agreement: false }, 0), 1);
});

test("the edge queue lists the refuted pair first, with live impact and the factor's summary", async () => {
  const db = seed();
  const r = await listEdgeProposals(fake(db, rpcs()), null);
  assert.equal(r.status, 200);
  const ps = r.body.proposals as Array<Record<string, unknown>>;
  assert.deepEqual(ps.map((p) => p.id), ["p-ref", "p-conf"]);
  assert.equal(ps[0].impact, 52);
  assert.equal(ps[1].fromSummary, "Rates of change.");
  assert.equal((await listEdgeProposals(fake(db, rpcs()), "made-up")).status, 400);
});

test("approving a decomposition proposal writes derives_from from the target to the factor, with provenance, and rebuilds nothing", async () => {
  const db = seed();
  const calls: string[] = [];
  const r = await decideEdge(fake(db, rpcs(), new Set(), calls), { id: "p-conf", decision: "approved", reason: null, reviewerId: "rev-1" });
  assert.equal(r.status, 200);
  assert.equal(r.body.kind, "derives_from");
  assert.equal(db.edges.length, 1);
  const e = db.edges[0];
  assert.deepEqual([e.from_id, e.to_id, e.kind, e.confidence, e.confidence_source], ["n-kin", "n-der", "derives_from", 0.95, "teacher"]);
  assert.deepEqual(e.provenance, {
    type: "edge_proposal",
    proposal_id: "p-conf",
    proposed_by: "prime_decompose_llm",
    model: "sonnet",
    verification: "confirmed",
    origin: "proposer",
    reviewer_id: "rev-1",
  });
  const p = db.edge_proposals.find((x) => x.id === "p-conf")!;
  assert.equal(p.status, "approved");
  assert.equal(p.decided_kind, "derives_from");
  assert.ok(!calls.includes("rpc:replace_prereq_ancestor"));
});

test("approving as prerequisite writes the factor to target edge and rebuilds the target's branch", async () => {
  const db = seed();
  const calls: string[] = [];
  const r = await decideEdge(fake(db, rpcs(), new Set(), calls), { id: "p-conf", decision: "approved", kind: "prerequisite", reason: null, reviewerId: "rev-1" });
  assert.equal(r.status, 200);
  assert.deepEqual([db.edges[0].from_id, db.edges[0].to_id, db.edges[0].kind], ["n-der", "n-kin", "prerequisite"]);
  assert.ok(calls.includes("rpc:replace_prereq_ancestor"));
});

test("a pair that would close a cycle returns 409 and stays pending", async () => {
  const db = seed();
  const r = await decideEdge(fake(db, rpcs(true)), { id: "p-conf", decision: "approved", reason: null, reviewerId: "rev-1" });
  assert.equal(r.status, 409);
  assert.equal(r.body.error, "would_close_cycle");
  assert.equal(db.edge_proposals.find((x) => x.id === "p-conf")!.status, "pending");
  assert.equal(db.edges.length, 0);
});

test("a failed edge write releases the claim, so the proposal stays pending", async () => {
  const db = seed();
  const r = await decideEdge(fake(db, rpcs(), new Set(["edges:upsert"])), { id: "p-conf", decision: "approved", reason: null, reviewerId: "rev-1" });
  assert.equal(r.status, 500);
  const p = db.edge_proposals.find((x) => x.id === "p-conf")!;
  assert.equal(p.status, "pending");
  assert.equal(p.decided_kind, null);
  assert.equal(p.reviewer_id, null);
});

test("a second decision on a decided proposal writes nothing", async () => {
  const db = seed();
  await decideEdge(fake(db, rpcs()), { id: "p-ref", decision: "rejected", reason: "only related", reviewerId: "rev-1" });
  const again = await decideEdge(fake(db, rpcs()), { id: "p-ref", decision: "approved", reason: null, reviewerId: "rev-2" });
  assert.equal(again.body.alreadyDecided, true);
  assert.equal(again.body.decision, "rejected");
  assert.equal(db.edges.length, 0);
});

test("a missing proposal is 404 and an unknown kind is 400", async () => {
  const db = seed();
  assert.equal((await decideEdge(fake(db, rpcs()), { id: "nope", decision: "approved", reason: null, reviewerId: "r" })).status, 404);
  const bad = await decideEdge(fake(db, rpcs()), { id: "p-conf", decision: "approved", kind: "cites" as never, reason: null, reviewerId: "r" });
  assert.equal(bad.status, 400);
});

test("the missing-prime list carries each naming node's reason and the branch approval would use", async () => {
  const db = seed();
  const r = await listNodeProposals(fake(db, rpcs()));
  const p = (r.body.proposals as Array<Record<string, any>>)[0];
  assert.equal(p.branchToCreate, "01-mathematics");
  assert.deepEqual(p.namedBy[0], { slug: "kinematics", title: "Kinematics", reason: "Position equals the integral of velocity." });
  assert.deepEqual(r.body.branches, ["01-mathematics", "02-physics"]);
});

test("approving a missing prime creates the node at the lowest naming tier and queues unchecked proposals for nodes that still exist", async () => {
  const db = seed();
  const r = await decideNode(fake(db, rpcs()), { id: "np-eq", decision: "approved", reason: null, reviewerId: "rev-1", overrides: { summary: "Two expressions name one value." } });
  assert.equal(r.status, 200);
  assert.equal(r.body.nodeSlug, "concept-equality");
  const n = db.nodes.find((x) => x.slug === "concept-equality")!;
  assert.equal(n.tier, 13);
  assert.deepEqual(n.labels, { en: { title: "Equality", summary: "Two expressions name one value." } });
  const queued = db.edge_proposals.filter((p) => p.from_slug === "concept-equality");
  assert.deepEqual(queued.map((p) => p.to_slug).sort(), ["kinematics", "sets"]);
  assert.ok(queued.every((p) => p.verification === "unchecked" && p.origin === "base_idea"));
  assert.equal(queued.find((p) => p.to_slug === "kinematics")!.impact, 52);
  const np = db.node_proposals[0];
  assert.equal(np.status, "approved");
  assert.equal(np.created_node_id, n.id);
});

test("a failed proposal write removes the new node and releases the claim", async () => {
  const db = seed();
  const r = await decideNode(fake(db, rpcs(), new Set(["edge_proposals:upsert"])), { id: "np-eq", decision: "approved", reason: null, reviewerId: "rev-1" });
  assert.equal(r.status, 500);
  assert.ok(!db.nodes.some((x) => x.slug === "concept-equality"));
  assert.equal(db.node_proposals[0].status, "pending");
});

test("an approval reuses an existing node with the slug, and an unknown branch override is refused", async () => {
  const db = seed();
  db.nodes.push({ id: "n-eq", slug: "concept-equality", title: "Equality", branch: "01-mathematics", tier: 13, summary: null });
  const r = await decideNode(fake(db, rpcs()), { id: "np-eq", decision: "approved", reason: null, reviewerId: "rev-1" });
  assert.equal(r.status, 200);
  assert.equal(db.nodes.filter((x) => x.slug === "concept-equality").length, 1);
  assert.equal(db.node_proposals[0].created_node_id, "n-eq");
  const db2 = seed();
  const bad = await decideNode(fake(db2, rpcs()), { id: "np-eq", decision: "approved", reason: null, reviewerId: "r", overrides: { branch: "99-nowhere" } });
  assert.equal(bad.status, 400);
});

test("a missing prime with no definition is refused until the reviewer writes one, and stays pending", async () => {
  const db = seed();
  db.node_proposals[0].summary = null;
  const r = await decideNode(fake(db, rpcs()), { id: "np-eq", decision: "approved", reason: null, reviewerId: "rev-1" });
  assert.equal(r.status, 400);
  assert.equal(db.node_proposals[0].status, "pending");
  assert.ok(!db.nodes.some((x) => x.slug === "concept-equality"));
  const listed = await listNodeProposals(fake(db, rpcs()));
  assert.equal((listed.body.proposals as Array<Record<string, any>>)[0].summary, null);
});

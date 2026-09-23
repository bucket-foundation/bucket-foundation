import test from "node:test";
import assert from "node:assert/strict";
import {
  decideEdge,
  decideIrreducible,
  decideNode,
  listEdgeProposals,
  listIrreducible,
  listNodeProposals,
  priorityOf,
} from "../src/lib/research-os/inference/review-actions";
import { forgetMakeupSnapshot } from "../src/lib/research-os/makeup";

type Row = Record<string, any>;
type Db = Record<string, Row[]>;
type Rpc = (args: any) => { data: unknown; error: { message: string } | null };

let nextId = 1;
const newId = () => `id-${nextId++}`;

function fake(db: Db, rpcs: Record<string, Rpc>, fail: Set<string> = new Set(), calls: string[] = [], before: Record<string, () => void> = {}) {
  const seen = new Map<string, number>();
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
      const key = `${this.table}:${this.op}`;
      calls.push(key);
      const nth = (seen.get(key) ?? 0) + 1;
      seen.set(key, nth);
      before[`${key}#${nth}`]?.();
      if (fail.has(key) || fail.has(`${key}#${nth}`)) return { data: null, error: { message: "injected failure" } };
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
        const written: Row[] = [];
        for (const r of this.rows!) {
          const existing = t.find((x) => keys.every((k) => x[k] === r[k]));
          if (existing) {
            if (!this.opts?.ignoreDuplicates) {
              Object.assign(existing, r);
              written.push(existing);
            }
          } else {
            const added = { id: newId(), ...r };
            t.push(added);
            written.push(added);
          }
        }
        data = this.returning ? written.map((r) => ({ id: r.id })) : null;
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
  enforce_prerequisite_tiers: () => ({ data: 3, error: null }),
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
  assert.ok(calls.includes("rpc:enforce_prerequisite_tiers"));
  assert.equal(r.body.tiersRaised, 3);
  assert.ok(calls.indexOf("rpc:enforce_prerequisite_tiers") < calls.indexOf("rpc:replace_prereq_ancestor"), "tiers rise before the closure rebuild");
});

test("approving as rests-on leaves grade tiers alone", async () => {
  const db = seed();
  const calls: string[] = [];
  const r = await decideEdge(fake(db, rpcs(), new Set(), calls), { id: "p-conf", decision: "approved", kind: "derives_from", reason: null, reviewerId: "rev-1" });
  assert.equal(r.status, 200);
  assert.ok(!calls.includes("rpc:enforce_prerequisite_tiers"));
  assert.equal(r.body.tiersRaised, undefined);
});

test("a failed tier raise keeps the edge and says so", async () => {
  const db = seed();
  const failing = { ...rpcs(), enforce_prerequisite_tiers: () => ({ data: null, error: { message: "boom" } }) };
  const r = await decideEdge(fake(db, failing), { id: "p-conf", decision: "approved", kind: "prerequisite", reason: null, reviewerId: "rev-1" });
  assert.equal(r.status, 200);
  assert.equal(db.edges.length, 1);
  assert.match(String(r.body.warning), /grade tiers/);
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
  assert.equal(r.body.reused, false);
  assert.equal(r.body.queuedEdges, 2);
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
  assert.equal(r.body.reused, true);
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

test("a failed release after a failed edge write says the claim is held", async () => {
  const db = seed();
  const r = await decideEdge(fake(db, rpcs(), new Set(["edges:upsert", "edge_proposals:update#2"])), {
    id: "p-conf",
    decision: "approved",
    reason: null,
    reviewerId: "rev-1",
  });
  assert.equal(r.status, 500);
  assert.equal(r.body.error, "edge_write_failed_claim_held");
});

test("a cycle that appears after the claim is refused and the claim released", async () => {
  const db = seed();
  let n = 0;
  const r = await decideEdge(fake(db, { ...rpcs(), rests_on: () => ({ data: ++n > 1, error: null }) }), {
    id: "p-conf",
    decision: "approved",
    reason: null,
    reviewerId: "rev-1",
  });
  assert.equal(r.status, 409);
  assert.equal(db.edge_proposals.find((x) => x.id === "p-conf")!.status, "pending");
  assert.equal(db.edges.length, 0);
});

test("a learning-order approval rebuilds the target's branch and every branch resting on it", async () => {
  const db = seed();
  db.prereq_ancestor.push({ node_id: "n-set", ancestor_id: "n-kin", min_hops: 1, min_confidence: 1 });
  const rebuilt: string[] = [];
  const r = await decideEdge(
    fake(db, { ...rpcs(), replace_prereq_ancestor: (a: { p_branch: string }) => (rebuilt.push(a.p_branch), { data: 0, error: null }) }),
    { id: "p-conf", decision: "approved", kind: "prerequisite", reason: null, reviewerId: "rev-1" },
  );
  assert.equal(r.status, 200);
  assert.deepEqual(rebuilt.sort(), ["01-mathematics", "02-physics"]);
  assert.equal(r.body.warning, undefined);
});

test("a failed closure rebuild keeps the approval and warns that routing is stale", async () => {
  const db = seed();
  const r = await decideEdge(fake(db, { ...rpcs(), replace_prereq_ancestor: () => ({ data: null, error: { message: "down" } }) }), {
    id: "p-conf",
    decision: "approved",
    kind: "prerequisite",
    reason: null,
    reviewerId: "rev-1",
  });
  assert.equal(r.status, 200);
  assert.equal(db.edges.length, 1);
  assert.match(String(r.body.warning), /02-physics/);
});

test("a node the cleanup could not delete is reported by slug", async () => {
  const db = seed();
  const r = await decideNode(fake(db, rpcs(), new Set(["edge_proposals:upsert", "nodes:delete"])), {
    id: "np-eq",
    decision: "approved",
    reason: null,
    reviewerId: "rev-1",
  });
  assert.equal(r.status, 500);
  assert.equal(r.body.error, "edge_proposal_write_failed_node_left");
  assert.equal(r.body.nodeSlug, "concept-equality");
  assert.equal(r.body.claimHeld, false);
  assert.equal(db.node_proposals[0].status, "pending");
});

test("irreducible verdicts list by how many ideas rest on them, and a decision is claimed once", async () => {
  const db = seed();
  db.irreducible_proposals = [
    { id: "ir-set", node_slug: "sets", justification: "Nothing simpler.", model: "m", status: "pending", created_at: "2026-09-18T00:00:00Z" },
    { id: "ir-kin", node_slug: "kinematics", justification: "Base of motion.", model: "m", status: "pending", created_at: "2026-09-18T00:00:01Z" },
  ];
  const listed = await listIrreducible(fake(db, rpcs()));
  const ps = listed.body.proposals as Array<Record<string, any>>;
  assert.deepEqual(
    ps.map((p) => [p.slug, p.dependents, p.title]),
    [
      ["kinematics", 52, "Kinematics"],
      ["sets", 0, "Sets and functions"],
    ],
  );
  const r = await decideIrreducible(fake(db, rpcs()), { id: "ir-kin", decision: "confirmed", reason: "a starting point", reviewerId: "rev-1" });
  assert.deepEqual(r.body, { decision: "confirmed", alreadyDecided: false });
  const row = db.irreducible_proposals.find((x) => x.id === "ir-kin")!;
  assert.equal(row.status, "confirmed");
  assert.equal(row.decision_reason, "a starting point");
  const again = await decideIrreducible(fake(db, rpcs()), { id: "ir-kin", decision: "rejected", reason: null, reviewerId: "rev-2" });
  assert.deepEqual(again.body, { decision: "confirmed", alreadyDecided: true });
  assert.equal((await decideIrreducible(fake(db, rpcs()), { id: "nope", decision: "confirmed", reason: null, reviewerId: "r" })).status, 404);
  assert.equal((await decideIrreducible(fake(db, rpcs(), new Set(["irreducible_proposals:update"])), { id: "ir-set", decision: "rejected", reason: null, reviewerId: "r" })).status, 500);
});

test("loop flags are computed from the pending set as it stands, so rejecting one side clears the other", async () => {
  forgetMakeupSnapshot();
  const db = seed();
  for (const n of db.nodes) n.visibility = "public";
  db.edge_proposals.push({
    ...db.edge_proposals[0],
    id: "p-back",
    from_slug: "kinematics",
    to_slug: "derivatives",
    branch: "01-mathematics",
    in_cycle: false,
    created_at: "2026-09-18T00:00:02Z",
  });
  const before = (await listEdgeProposals(fake(db, rpcs()), null)).body.proposals as Array<Record<string, any>>;
  const flag = (ps: Array<Record<string, any>>, id: string) => ps.find((p) => p.id === id)?.inCycle;
  assert.equal(flag(before, "p-conf"), true);
  assert.equal(flag(before, "p-back"), true);
  assert.equal(flag(before, "p-ref"), false);
  assert.deepEqual([before.find((p) => p.id === "p-conf")!.fromTier, before.find((p) => p.id === "p-conf")!.toTier], [15, 14]);
  await decideEdge(fake(db, rpcs()), { id: "p-back", decision: "rejected", reason: "backwards", reviewerId: "rev-1" });
  const after = (await listEdgeProposals(fake(db, rpcs()), null)).body.proposals as Array<Record<string, any>>;
  assert.equal(flag(after, "p-conf"), false);
  forgetMakeupSnapshot();
});

test("the list names the chain a pair would shortcut, and the names follow each approval", async () => {
  forgetMakeupSnapshot();
  const db = seed();
  for (const n of db.nodes) n.visibility = "public";
  db.edge_proposals.push({ ...db.edge_proposals[0], id: "p-chain", from_slug: "sets", to_slug: "derivatives", branch: "01-mathematics", created_at: "2026-09-18T00:00:03Z" });
  const standing = async () => {
    const ps = (await listEdgeProposals(fake(db, rpcs()), null)).body.proposals as Array<Record<string, any>>;
    const p = ps.find((x) => x.id === "p-ref")!;
    return { implied: p.implied, viaPending: p.viaPending, through: p.through.map((t: { slug: string }) => t.slug) };
  };
  assert.deepEqual(await standing(), { implied: false, viaPending: true, through: ["derivatives"] });
  const a = await decideEdge(fake(db, rpcs()), { id: "p-conf", decision: "approved", kind: "derives_from", reason: null, reviewerId: "rev-1" });
  assert.equal(a.status, 200);
  assert.deepEqual(await standing(), { implied: false, viaPending: true, through: ["derivatives"] }, "half the chain in the graph, half pending");
  const b = await decideEdge(fake(db, rpcs()), { id: "p-chain", decision: "approved", kind: "derives_from", reason: null, reviewerId: "rev-1" });
  assert.equal(b.status, 200);
  assert.deepEqual(await standing(), { implied: true, viaPending: false, through: ["derivatives"] }, "the whole chain in the graph");
  forgetMakeupSnapshot();
});

test("a claim that loses the race reports the status the row holds now", async () => {
  const db = seed();
  const raced = () => {
    db.edge_proposals.find((x) => x.id === "p-ref")!.status = "approved";
  };
  const r = await decideEdge(fake(db, rpcs(), new Set(), [], { "edge_proposals:update#1": raced }), { id: "p-ref", decision: "rejected", reason: null, reviewerId: "rev-a" });
  assert.deepEqual(r.body, { decision: "approved", alreadyDecided: true });
  const np = db.node_proposals[0];
  const r2 = await decideNode(
    fake(db, rpcs(), new Set(), [], { "node_proposals:update#1": () => (np.status = "rejected") }),
    { id: np.id as string, decision: "approved", reason: null, reviewerId: "rev-a", overrides: {} },
  );
  assert.deepEqual(r2.body, { decision: "rejected", alreadyDecided: true });
  db.irreducible_proposals = [{ id: "ir-set", node_slug: "sets", justification: "Nothing simpler.", model: "m", status: "pending", created_at: "2026-09-18T00:00:00Z" }];
  const ir = db.irreducible_proposals[0];
  const r3 = await decideIrreducible(
    fake(db, rpcs(), new Set(), [], { "irreducible_proposals:update#1": () => (ir.status = "confirmed") }),
    { id: ir.id as string, decision: "rejected", reason: null, reviewerId: "rev-a" },
  );
  assert.deepEqual(r3.body, { decision: "confirmed", alreadyDecided: true });
  const db2 = seed();
  const r4 = await decideEdge(
    fake(db2, rpcs(), new Set(["edge_proposals:select#2"]), [], { "edge_proposals:update#1": () => (db2.edge_proposals.find((x) => x.id === "p-ref")!.status = "approved") }),
    { id: "p-ref", decision: "rejected", reason: null, reviewerId: "rev-a" },
  );
  assert.deepEqual(r4.body, { decision: null, alreadyDecided: true });
});

function medallionSeed(): Db {
  const db = seed();
  db.edge_proposals.push({
    id: "p-med",
    from_slug: "derivatives",
    to_slug: "kinematics",
    branch: "02-physics",
    status: "pending",
    confidence: 0.7,
    confidence_source: "medallion_lexical",
    agreement: false,
    verification: null,
    origin: null,
    refd: null,
    justification: "canon-all word match (concept_lexical): rate.",
    secondary_justification: null,
    model: "none",
    prompt_hash: "h2",
    created_at: "2026-09-23T00:00:00Z",
    impact: 0,
    cross_branch: true,
    action: "add",
    proposed_kind: "derives_from",
    silver_item_id: "s-edge",
  });
  db.edge_proposals = db.edge_proposals.filter((p) => p.id === "p-med");
  db.silver_items = [
    { id: "s-edge", source_id: `file:${"b".repeat(64)}`, source_revision: "r1", kind: "edge_candidate", locator: "00:01:02.000", text: null, text_hash: "c".repeat(64), confidence: 0.7 },
    { id: "s-node", source_id: `file:${"d".repeat(64)}`, source_revision: "r2", kind: "claim", locator: null, text: "A claim.", text_hash: "e".repeat(64), confidence: 0.9 },
  ];
  db.evidence_source_admissions = [
    { source_id: `file:${"b".repeat(64)}`, source_revision: "r1", allow_index: false, status: "active" },
    { source_id: `file:${"d".repeat(64)}`, source_revision: "r2", allow_index: true, status: "active" },
  ];
  db.gold_lineage = [];
  db.node_proposals.push({
    id: "np-draft",
    key: "medallion:claim-02-physics-x",
    title: "A claim",
    branch: "02-physics",
    justification: "New excerpt from canon-all, silver confidence 0.9.",
    summary: "A claim.",
    named_by: [],
    aliases: [],
    reasons: {},
    possible_duplicates: [],
    base_match: null,
    model: "none",
    status: "pending",
    created_at: "2026-09-23T00:00:00Z",
    silver_item_id: "s-node",
    draft: {
      slug: "claim-02-physics-x",
      title: "A claim",
      kind: "excerpt",
      tier: 15,
      branch: "02-physics",
      summary: "A claim.",
      labels: { en: { title: "A claim" } },
      provenance: { type: "source_excerpt", branch: "02-physics", concept: "x", claim_slug: "001-x" },
    },
  });
  return db;
}

test("the medallion queue lists silver with refused text and locator withheld", async () => {
  const db = medallionSeed();
  const r = await listEdgeProposals(fake(db, rpcs()), "medallion_lexical");
  assert.equal(r.status, 200);
  const [p] = r.body.proposals as Array<Record<string, any>>;
  assert.equal(p.id, "p-med");
  assert.equal(p.action, "add");
  assert.equal(p.proposedKind, "derives_from");
  assert.equal(p.silver.sourceId, `file:${"b".repeat(64)}`);
  assert.equal(p.silver.locator, null);
  assert.equal(p.silver.text, null);
  assert.equal(p.silver.redacted, true);
  assert.equal(p.silver.band, "uncertain");
});

test("approving a medallion proposal writes its proposed kind and the reviewer's lineage", async () => {
  const db = medallionSeed();
  const r = await decideEdge(fake(db, rpcs()), { id: "p-med", decision: "approved", reason: null, reviewerId: "rev-1" });
  assert.equal(r.status, 200);
  assert.equal(r.body.kind, "derives_from");
  assert.equal(r.body.warning, undefined);
  const e = db.edges[0];
  assert.deepEqual([e.from_id, e.to_id, e.kind], ["n-kin", "n-der", "derives_from"]);
  assert.deepEqual(
    db.gold_lineage.map((l) => [l.edge_id, l.silver_item_id, l.promoted_by, l.reviewer_id]),
    [[e.id, "s-edge", "reviewer", "rev-1"]],
  );
});

test("a failed lineage write keeps the approved edge and says so", async () => {
  const db = medallionSeed();
  const r = await decideEdge(fake(db, rpcs(), new Set(["gold_lineage:insert"])), { id: "p-med", decision: "approved", reason: null, reviewerId: "rev-1" });
  assert.equal(r.status, 200);
  assert.equal(db.edges.length, 1);
  assert.match(String(r.body.warning), /lineage was not recorded/);
});

test("approving a medallion node proposal creates the drafted node with its kind and provenance", async () => {
  const db = medallionSeed();
  const calls: string[] = [];
  const r = await decideNode(fake(db, rpcs(), new Set(), calls), { id: "np-draft", decision: "approved", reason: null, reviewerId: "rev-1" });
  assert.equal(r.status, 200);
  assert.equal(r.body.nodeSlug, "claim-02-physics-x");
  assert.equal(r.body.queuedEdges, 0);
  const n = db.nodes.find((x) => x.slug === "claim-02-physics-x")!;
  assert.equal(n.kind, "excerpt");
  assert.equal(n.provenance.type, "source_excerpt");
  assert.deepEqual(db.gold_lineage.map((l) => [l.node_id, l.silver_item_id, l.promoted_by]), [[n.id, "s-node", "reviewer"]]);
  assert.equal(db.node_proposals.find((x) => x.id === "np-draft")!.created_node_id, n.id);
  assert.ok(!calls.includes("edge_proposals:upsert"));

  const again = await decideNode(fake(db, rpcs()), { id: "np-draft", decision: "approved", reason: null, reviewerId: "rev-1" });
  assert.equal(again.body.alreadyDecided, true);
});

test("rejecting a medallion node proposal writes no node", async () => {
  const db = medallionSeed();
  const before = db.nodes.length;
  const r = await decideNode(fake(db, rpcs()), { id: "np-draft", decision: "rejected", reason: "a transcript line", reviewerId: "rev-1" });
  assert.equal(r.status, 200);
  assert.equal(r.body.decision, "rejected");
  assert.equal(db.nodes.length, before);
  assert.equal(db.gold_lineage.length, 0);
});

test("a failed node insert releases the medallion node proposal", async () => {
  const db = medallionSeed();
  const r = await decideNode(fake(db, rpcs(), new Set(["nodes:insert"])), { id: "np-draft", decision: "approved", reason: null, reviewerId: "rev-1" });
  assert.equal(r.status, 500);
  assert.equal(db.node_proposals.find((x) => x.id === "np-draft")!.status, "pending");
});

function demotionSeed(): Db {
  const db = medallionSeed();
  db.edge_proposals = [
    {
      ...db.edge_proposals[0],
      id: "p-dem",
      from_slug: "derivatives",
      to_slug: "kinematics",
      action: "demote",
      proposed_kind: "derives_from",
      silver_item_id: "s-edge",
    },
  ];
  db.edges = [{ id: "e-lex", from_id: "n-kin", to_id: "n-der", kind: "derives_from", confidence: 0.7, provenance: { rule: "concept_lexical" } }];
  return db;
}

test("keeping a demoted edge writes no edge and records the reviewer's lineage", async () => {
  const db = demotionSeed();
  const calls: string[] = [];
  const r = await decideEdge(fake(db, rpcs(), new Set(), calls), { id: "p-dem", decision: "approved", reason: null, reviewerId: "rev-1" });
  assert.equal(r.status, 200);
  assert.equal(r.body.kept, true);
  assert.deepEqual(db.edges.map((e) => [e.id, e.kind]), [["e-lex", "derives_from"]]);
  assert.ok(!calls.includes("edges:upsert"));
  assert.deepEqual(db.gold_lineage.map((l) => [l.edge_id, l.promoted_by, l.reviewer_id]), [["e-lex", "reviewer", "rev-1"]]);
  const p = db.edge_proposals[0];
  assert.deepEqual([p.status, p.decided_kind, p.reviewer_id], ["approved", "derives_from", "rev-1"]);
});

test("rejecting a demoted edge recasts it through the locked database function", async () => {
  const db = demotionSeed();
  const seen: unknown[] = [];
  const r = await decideEdge(
    fake(db, { ...rpcs(), recast_edge_to_cites: (a: unknown) => (seen.push(a), { data: { ok: true, cites_inserted: true }, error: null }) }),
    { id: "p-dem", decision: "rejected", reason: "a word match", reviewerId: "rev-1" },
  );
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { decision: "rejected", alreadyDecided: false, recastTo: "cites" });
  assert.deepEqual(seen, [{ p_proposal: "p-dem", p_reviewer: "rev-1", p_reason: "a word match" }]);
});

test("a recast reports a decided proposal, a vanished edge and a failed call", async () => {
  const decided = await decideEdge(fake(demotionSeed(), { ...rpcs(), recast_edge_to_cites: () => ({ data: { ok: false, error: "already_decided", status: "approved" }, error: null }) }), {
    id: "p-dem",
    decision: "rejected",
    reason: null,
    reviewerId: "rev-1",
  });
  assert.deepEqual(decided.body, { decision: "approved", alreadyDecided: true });
  const gone = await decideEdge(fake(demotionSeed(), { ...rpcs(), recast_edge_to_cites: () => ({ data: { ok: false, error: "edge_gone" }, error: null }) }), {
    id: "p-dem",
    decision: "rejected",
    reason: null,
    reviewerId: "rev-1",
  });
  assert.equal(gone.status, 409);
  const broken = await decideEdge(fake(demotionSeed(), { ...rpcs(), recast_edge_to_cites: () => ({ data: null, error: { message: "boom" } }) }), {
    id: "p-dem",
    decision: "rejected",
    reason: null,
    reviewerId: "rev-1",
  });
  assert.equal(broken.status, 500);
});

test("keeping a demoted edge that is gone is refused and the proposal stays pending", async () => {
  const db = demotionSeed();
  db.edges = [];
  const r = await decideEdge(fake(db, rpcs()), { id: "p-dem", decision: "approved", reason: null, reviewerId: "rev-1" });
  assert.equal(r.status, 409);
  assert.equal(db.edge_proposals[0].status, "pending");
  const done = demotionSeed();
  done.edge_proposals[0].status = "rejected";
  const again = await decideEdge(fake(done, rpcs()), { id: "p-dem", decision: "approved", reason: null, reviewerId: "rev-1" });
  assert.deepEqual(again.body, { decision: "rejected", alreadyDecided: true });
});

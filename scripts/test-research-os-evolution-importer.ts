import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parsePolicy } from "../src/lib/research-os/evidence/rights";
import {
  batchGate,
  batchPromotionEnabled,
  evolutionRights,
  GATED_RULES,
  planEvolution,
  RightsRefusal,
  silverKeyOf,
  wilsonUpper,
  type EvolutionSource,
} from "../src/lib/evolution/importer";
import { fixtureRecords, fixtureText, type FixtureRow } from "./research-os/evolution/lib/fixture";

const policy = parsePolicy(JSON.parse(fs.readFileSync(path.join(__dirname, "..", "learning", "research-os", "ai", "rights-policy.json"), "utf8")));

const rows: FixtureRow[] = [
  { id: "onet-15-1252", subject: { kind: "node", slug: "occupation-software-developers", nodeKind: "occupation" }, role: "emerged", year: 1957 },
  { id: "onet-15-9999", subject: { kind: "node", slug: "occupation-new-thing", nodeKind: "occupation", draft: { slug: "occupation-new-thing", title: "New thing", kind: "occupation", tier: 13, branch: "11-work", summary: null, labels: {}, provenance: { type: "onet_occupation", level: "onet" } } }, role: "emerged", year: 2011 },
  { id: "onet-perf", subject: { kind: "edge", fromSlug: "occupation-software-developers", toSlug: "task-write-code", edgeKind: "performs" }, role: "began", year: 1960 },
  { id: "onet-missing-edge", subject: { kind: "edge", fromSlug: "occupation-software-developers", toSlug: "task-nothing", edgeKind: "performs" }, role: "began", year: 1961 },
  { id: "onet-bad-role", subject: { kind: "node", slug: "occupation-software-developers", nodeKind: "occupation" }, role: "released", year: 1990 },
];

const nodes = [
  { slug: "occupation-software-developers", kind: "occupation" },
  { slug: "task-write-code", kind: "task" },
];
const edges = [{ id: "0f8fad5b-d9cb-469f-a165-70867728950e", fromSlug: "occupation-software-developers", toSlug: "task-write-code", kind: "performs" }];

function plan(rule: string, repoPath: string, salt = "a", r = rows) {
  const sources: EvolutionSource[] = [{ repoPath, rule, prior: 0.9 }];
  return planEvolution({ sources, files: new Map([[repoPath, Buffer.from(fixtureText(r, salt))]]), policy, nodes, edges, records: fixtureRecords(r) });
}

test("every named evolution rule is in the policy and parses", () => {
  for (const id of ["onet-cc-by", "bls-oews-pd", "wikidata-evolution-cc0", "openalex-cc0", "science4cast-cc-by", "eloundou-mit", "libraries-io-cc-by-sa", "so-survey-odbl", "pypl-cc-by"]) {
    const rule = policy.index.find((r) => r.id === id);
    assert.ok(rule, id);
    assert.equal(rule!.allow, true, id);
    assert.match(rule!.match.sourcePrefix ?? "", /^_intake\/evolution\/[a-z0-9-]+\/$/, id);
  }
});

test("every rule records how and when its license was checked", () => {
  for (const r of policy.index.filter((x) => x.match.sourcePrefix)) assert.match(r.basis, /License checked 2026-09-24/, r.id);
  const s4c = policy.index.find((r) => r.id === "science4cast-cc-by")!;
  assert.ok(s4c.evidence.includes("https://zenodo.org/api/records/7882892"));
  assert.equal(GATED_RULES.length, 7);
  assert.ok(!policy.index.some((r) => r.id === "histpat-cc0" || r.id === "patentsview-cc-by"));
});

test("each license gate loads nothing", () => {
  for (const id of GATED_RULES) {
    const rule = policy.index.find((r) => r.id === id);
    assert.ok(rule && rule.allow === false && rule.permission === "unverified", id);
    assert.throws(() => evolutionRights(policy, id, `${rule!.match.sourcePrefix}x.json`), (e: unknown) => e instanceof RightsRefusal && e.reason === "gated");
    assert.throws(() => plan(id, `${rule!.match.sourcePrefix}x.json`), RightsRefusal);
  }
});

test("an unknown rule, a history rule or a path outside the prefix is refused", () => {
  assert.throws(() => evolutionRights(policy, "no-such-rule", "_intake/evolution/onet/x.json"), (e: unknown) => e instanceof RightsRefusal && e.reason === "unknown_rule");
  assert.throws(() => evolutionRights(policy, "wikidata-cc0", "_intake/evolution/wikidata/x.json"), (e: unknown) => e instanceof RightsRefusal && e.reason === "not_evolution");
  assert.throws(() => evolutionRights(policy, "onet-cc-by", "_intake/evolution/bls-oews/x.json"), (e: unknown) => e instanceof RightsRefusal && e.reason === "outside_prefix");
});

test("the plan writes silver for every fitting record and refuses the rest", () => {
  const p = plan("onet-cc-by", "_intake/evolution/onet/fixture/rows.jsonl");
  assert.equal(p.bronze.length, 1);
  assert.equal(p.bronze[0].rights.rule, "onet-cc-by");
  assert.deepEqual(p.silver.map((s) => s.proposal.record), ["onet-15-1252", "onet-15-9999", "onet-perf"]);
  assert.deepEqual(p.refused.map((r) => r.reason), ["edge_not_found", "roles released do not fit"]);
  assert.equal(p.silver[2].subject, "edge:0f8fad5b-d9cb-469f-a165-70867728950e");
  assert.equal(p.silver[0].parser, "evolution-import");
  assert.equal(p.silver[0].text, "1957");
  assert.equal(p.proposals.length, 0);
  assert.deepEqual(p.importPromotions.map((x) => [x.kind, x.silver.subject]), [["node", "occupation-new-thing"]]);
  assert.equal(p.silver[1].proposal.node?.slug, "occupation-new-thing");
  assert.deepEqual(p.promotions.map((s) => s.proposal.record), ["onet-15-1252", "onet-perf"]);
});

test("a CC0 source writes silver and leaves promotion to a reviewer or a batch", () => {
  const p = plan("wikidata-evolution-cc0", "_intake/evolution/wikidata/fixture/rows.jsonl", "a", rows.slice(0, 1));
  assert.equal(p.silver.length, 1);
  assert.deepEqual(p.promotions, []);
});

test("share-alike sources are marked internal", () => {
  const p = plan("libraries-io-cc-by-sa", "_intake/evolution/libraries-io/fixture/rows.jsonl", "a", rows.slice(0, 1));
  assert.equal(p.silver[0].proposal.internal, true);
  assert.equal(plan("onet-cc-by", "_intake/evolution/onet/fixture/rows.jsonl").silver[0].proposal.internal, false);
});

test("the same input plans the same silver keys, so reruns write nothing new", () => {
  const a = plan("onet-cc-by", "_intake/evolution/onet/fixture/rows.jsonl").silver.map(silverKeyOf);
  const b = plan("onet-cc-by", "_intake/evolution/onet/fixture/rows.jsonl").silver.map(silverKeyOf);
  assert.deepEqual(a, b);
  const c = plan("onet-cc-by", "_intake/evolution/onet/fixture/rows.jsonl", "b").silver.map(silverKeyOf);
  assert.notDeepEqual(a, c);
});

test("Wilson upper bounds", () => {
  assert.ok(Math.abs(wilsonUpper(0, 200) - 0.01884) < 1e-4);
  assert.ok(wilsonUpper(3, 200) < 0.05);
  assert.ok(wilsonUpper(5, 200) > 0.05);
  assert.throws(() => wilsonUpper(1, 0));
  assert.throws(() => wilsonUpper(3, 2));
});

test("batch promotion stays off until the founder turns it on", () => {
  assert.equal(batchPromotionEnabled({}), false);
  assert.equal(batchPromotionEnabled({ EVOLUTION_BATCH_PROMOTION: "1" }), false);
  assert.equal(batchPromotionEnabled({ EVOLUTION_BATCH_PROMOTION: "on" }), true);
  assert.deepEqual(batchGate({ rule: "openalex-cc0", sample: 200, errors: 0, enabled: false }), { ok: false, reason: "batch_promotion_off" });
});

test("the batch gate", () => {
  assert.equal(batchGate({ rule: "openalex-cc0", sample: 200, errors: 0, enabled: true }).ok, true);
  assert.equal(batchGate({ rule: "openalex-cc0", sample: 199, errors: 0, enabled: true }).ok, false);
  const high = batchGate({ rule: "openalex-cc0", sample: 200, errors: 5, enabled: true });
  assert.equal(!high.ok && high.reason, "upper_bound_too_high");
  const sa = batchGate({ rule: "so-survey-odbl", sample: 200, errors: 0, enabled: true });
  assert.equal(!sa.ok && sa.reason, "share_alike");
  const by = batchGate({ rule: "onet-cc-by", sample: 200, errors: 0, enabled: true });
  assert.equal(!by.ok && by.reason, "rule_not_batchable");
});

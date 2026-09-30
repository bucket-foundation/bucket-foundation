import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parsePolicy } from "../src/lib/research-os/evidence/rights";
import { batchGate, planEvolution } from "../src/lib/evolution/importer";
import {
  checkManifest,
  ELOUNDOU_BETA,
  LABOR_PLAN_COUNTS,
  laborEdges,
  laborRecords,
  laborSources,
  LLM_TECHNOLOGY_SLUG,
  occupationSlug,
  taskSlug,
  toolSlug,
} from "../src/lib/evolution/labor";
import { laborFixture } from "./research-os/evolution/lib/labor-fixture";

const policy = parsePolicy(JSON.parse(fs.readFileSync(path.join(__dirname, "..", "learning", "research-os", "ai", "rights-policy.json"), "utf8")));

test("the plan counts are the E3 row's", () => {
  assert.deepEqual(LABOR_PLAN_COUNTS, { occupations: 1016, tasks: 19281, tech_skills: 32435 });
});

test("the manifest must match the export row for row and byte for byte", () => {
  const { manifest, files } = laborFixture("a");
  assert.deepEqual(checkManifest(manifest, files, false), { ok: true });
  const bad = structuredClone(manifest);
  bad.files.tasks!.rows = 4;
  const r = checkManifest(bad, files, false);
  assert.equal(r.ok, false);
  assert.match(!r.ok ? r.problems.join(" ") : "", /tasks: 3 rows, manifest says 4/);
  const tampered = new Map(files);
  tampered.set(manifest.files.occupations!.path, Buffer.from("{}\n"));
  assert.match((checkManifest(manifest, tampered, false) as { problems: string[] }).problems.join(" "), /sha256/);
});

test("the export must name its upstream table and license rule", () => {
  const { manifest, files } = laborFixture("a");
  const wrongRule = structuredClone(manifest);
  wrongRule.files.eloundou!.upstream.license_rule = "wikidata-evolution-cc0";
  assert.match((checkManifest(wrongRule, files, false) as { problems: string[] }).problems.join(" "), /upstream license rule wikidata-evolution-cc0, expected eloundou-mit/);
  const wrongTable = structuredClone(manifest);
  wrongTable.files.tech_skills!.upstream.table = "tasks";
  assert.match((checkManifest(wrongTable, files, false) as { problems: string[] }).problems.join(" "), /upstream onet.tasks, expected onet.technology_skills/);
  const rows = structuredClone(manifest);
  rows.files.tasks!.upstream.rows = 19281;
  assert.match((checkManifest(rows, files, false) as { problems: string[] }).problems.join(" "), /upstream has 19281 rows, the export 3/);
});

test("the ops manifests on measure/evo-labor pin the plan counts", () => {
  const onet = { occupations: 1016, tasks: 19281, technology_skills: 32435 };
  assert.deepEqual({ occupations: LABOR_PLAN_COUNTS.occupations, tasks: LABOR_PLAN_COUNTS.tasks, technology_skills: LABOR_PLAN_COUNTS.tech_skills }, onet);
});

test("a real release must carry the plan counts", () => {
  const { manifest, files } = laborFixture("a");
  const r = checkManifest(manifest, files, true);
  assert.equal(r.ok, false);
  assert.match(!r.ok ? r.problems.join(" ") : "", /occupations: 2, the plan counts 1016/);
  const real = structuredClone(manifest);
  real.files.occupations!.rows = 1016;
  real.files.tasks!.rows = 19281;
  real.files.tech_skills!.rows = 32435;
  const counts = (checkManifest(real, files, true) as { problems: string[] }).problems;
  assert.ok(!counts.some((p) => p.includes("the plan counts")));
});

function plan(nodes: { slug: string; kind: string }[] = [], edges: { id: string; fromSlug: string; toSlug: string; kind: string }[] = []) {
  const { manifest, files } = laborFixture("a");
  return planEvolution({
    sources: laborSources(manifest),
    files,
    policy,
    nodes,
    edges,
    records: laborRecords(manifest),
    edgeCandidates: laborEdges(manifest),
  });
}

test("O*NET rows become occupation, task and software nodes and edges under the importer carve-out", () => {
  const p = plan();
  const nodes = p.importPromotions.filter((x) => x.kind === "node").map((x) => x.silver.subject).sort();
  assert.deepEqual(nodes, [occupationSlug("15-1251.00"), occupationSlug("15-1252.00"), toolSlug("Git"), toolSlug("Python"), taskSlug(16363), taskSlug(16987), taskSlug(8591)].sort());
  const edges = p.importPromotions.filter((x) => x.kind === "edge").map((x) => x.silver.subject).sort();
  assert.equal(edges.filter((e) => e.includes(" performs ")).length, 3);
  assert.equal(edges.filter((e) => e.includes(" uses ")).length, 3);
  assert.ok(!edges.some((e) => e.includes(" automates ")));
  assert.deepEqual(p.proposals.map((x) => x.draft.slug), [LLM_TECHNOLOGY_SLUG]);
});

test("Eloundou goes to a reviewer: automates candidates stay unpromoted and exposure waits for its edge", () => {
  const p = plan();
  const automates = p.edgeCandidates.filter((e) => e.proposal.edge_kind === "automates");
  assert.equal(automates.length, 2);
  assert.ok(automates.every((e) => e.proposal.rule === "eloundou-mit"));
  assert.equal(p.refused.filter((r) => r.reason === "edge_not_found").length, 2);
  const withEdge = plan([], [{ id: "0f8fad5b-d9cb-469f-a165-70867728950e", fromSlug: LLM_TECHNOLOGY_SLUG, toSlug: taskSlug(16363), kind: "automates" }]);
  const measured = withEdge.silver.find((s) => s.proposal.rule === "eloundou-mit" && s.proposal.record === "16363")!;
  assert.equal(measured.subject, "edge:0f8fad5b-d9cb-469f-a165-70867728950e");
  assert.deepEqual(measured.proposal.roles.measured.measure, { metric: "gpt4_exposure_beta", value: 1, unit: "beta" });
  assert.equal(measured.proposal.roles.measured.start_year, 2023);
  assert.deepEqual(withEdge.promotions, []);
});

test("the exposure weights are the paper's beta measure", () => {
  assert.deepEqual(ELOUNDOU_BETA.weights, { E0: 0, E1: 1, E2: 0.5 });
  assert.match(ELOUNDOU_BETA.basis, /beta = E1 \+ 0\.5 x E2/);
  assert.match(ELOUNDOU_BETA.url, /2303\.10130/);
});

test("the Wilson gate refuses a bad Eloundou batch and stays off by default", () => {
  assert.deepEqual(batchGate({ rule: "eloundou-mit", sample: 200, errors: 0, enabled: false }), { ok: false, reason: "batch_promotion_off" });
  const bad = batchGate({ rule: "eloundou-mit", sample: 200, errors: 6, enabled: true });
  assert.equal(!bad.ok && bad.reason, "upper_bound_too_high");
  assert.equal(batchGate({ rule: "eloundou-mit", sample: 200, errors: 0, enabled: true }).ok, true);
});

test("slugs stay inside the evolution slug check", () => {
  for (const s of [occupationSlug("15-1252.00"), taskSlug(16363), toolSlug("Microsoft Excel"), toolSlug("C++"), LLM_TECHNOLOGY_SLUG]) assert.match(s, /^[a-z0-9][a-z0-9-]{0,199}$/, s);
  assert.throws(() => occupationSlug("15-1252"));
  assert.throws(() => taskSlug(0));
});

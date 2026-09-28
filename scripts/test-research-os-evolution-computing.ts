import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parsePolicy } from "../src/lib/research-os/evidence/rights";
import { lineageCycles, planEvolution, RightsRefusal, type EvolutionSource } from "../src/lib/evolution/importer";
import { softwareLineage, softwareRecords, softwareReleaseSeries, softwareSlug } from "../src/lib/evolution/wikidata-software";
import { endoflifeRecords, endoflifeSeries } from "../src/lib/evolution/endoflife";
import { atlasSlug, mergeSoftwareAtlas } from "../src/lib/evolution/software-atlas-merge";
import type { AtlasTool } from "../src/lib/research-os/software-atlas";

const policy = parsePolicy(JSON.parse(fs.readFileSync(path.join(__dirname, "..", "learning", "research-os", "ai", "rights-policy.json"), "utf8")));
const WD = "_intake/evolution/wikidata/fixture/software.jsonl";

const oneRelease = JSON.stringify({ id: "Q11354", label: "Linux kernel", class: "os", inception: "1991-09-17" }) + "\n";

function planWd(text: string, rule = "wikidata-evolution-cc0", repoPath = WD, nodes: { slug: string; kind: string }[] = []) {
  const source: EvolutionSource = { repoPath, rule, prior: 0.8 };
  return planEvolution({
    sources: [source],
    files: new Map([[repoPath, Buffer.from(text)]]),
    policy,
    nodes,
    edges: [],
    records: softwareRecords,
    edgeCandidates: softwareLineage,
    series: softwareReleaseSeries,
  });
}

test("one fixture release gives one silver item", () => {
  const p = planWd(oneRelease);
  assert.equal(p.silver.length, 1);
  const s = p.silver[0];
  assert.equal(s.subject, "software-wikidata-q11354");
  assert.equal(s.text, "1991-09-17");
  assert.deepEqual(Object.keys(s.proposal.roles), ["released"]);
  assert.equal(s.proposal.roles.released.start_year, 1991);
  assert.equal(s.proposal.qid, "Q11354");
  assert.equal(p.proposals.length, 1);
  assert.equal(p.proposals[0].draft.provenance.level, "os");
  assert.deepEqual(p.edgeCandidates, []);
  assert.deepEqual(p.promotions, []);
});

test("an unapproved rule is refused", () => {
  assert.throws(() => planWd(oneRelease, "wikidata-cc0"), (e: unknown) => e instanceof RightsRefusal && e.reason === "not_evolution");
  assert.throws(() => planWd(oneRelease, "github-innovation-graph-gate", "_intake/evolution/github-innovation-graph/x.jsonl"), (e: unknown) => e instanceof RightsRefusal && e.reason === "gated");
  assert.throws(() => planWd(oneRelease, "wikidata-evolution-cc0", "_intake/evolution/openalex/x.jsonl"), (e: unknown) => e instanceof RightsRefusal && e.reason === "outside_prefix");
});

test("lineage candidates carry spans on the parent QID and lineage cycles are flagged", () => {
  const rows = [
    { id: "Q1", label: "A", class: "os", inception: "1970", based_on: ["Q2"] },
    { id: "Q2", label: "B", class: "os", inception: "1971", based_on: ["Q3"] },
    { id: "Q3", label: "C", class: "os", inception: "1972", based_on: ["Q1"] },
    { id: "Q4", label: "D", class: "os", inception: "1980", based_on: ["Q1"], influenced_by: ["Q5"] },
    { id: "Q5", label: "E", class: "language", inception: "1985", influenced_by: ["Q4"] },
  ];
  const text = rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
  const p = planWd(text);
  const byRecord = new Map(p.edgeCandidates.map((e) => [e.proposal.record, e]));
  assert.equal(p.edgeCandidates.length, 6);
  for (const r of ["Q1>Q2", "Q2>Q3", "Q3>Q1"]) assert.equal(byRecord.get(r)!.proposal.cycle, true, r);
  assert.equal(byRecord.get("Q4>Q1")!.proposal.cycle, false);
  assert.equal(byRecord.get("Q5~Q4")!.proposal.cycle, false);
  assert.equal(byRecord.get("Q4~Q5")!.proposal.cycle, false);
  assert.equal(p.counts.lineage_cycles, 3);
  const e = byRecord.get("Q1>Q2")!;
  assert.equal(e.proposal.edge_kind, "descends_from");
  assert.equal(e.proposal.from_slug, softwareSlug("Q1"));
  assert.equal(e.text, "Q2");
  assert.equal(byRecord.get("Q5~Q4")!.proposal.edge_kind, "influences");
  assert.equal(byRecord.get("Q5~Q4")!.proposal.from_slug, softwareSlug("Q5"));
});

test("a cycle through a gold lineage edge is flagged too", () => {
  const c = lineageCycles([
    { from: "a", to: "b", kind: "descends_from" },
    { from: "b", to: "a", kind: "descends_from" },
    { from: "a", to: "b", kind: "influences" },
    { from: "c", to: "c", kind: "replaces" },
  ]);
  assert.ok(c.has("descends_from a") && c.get("descends_from a") === c.get("descends_from b"));
  assert.ok(!c.has("influences a"));
  assert.ok(c.has("replaces c"));
});

test("release series count versions per year for resolved nodes only", () => {
  const row = { id: "Q28865", label: "Python", class: "language", inception: "1991-02-20", versions: [{ v: "3.0", date: "2008-12-03" }, { v: "2.6", date: "2008-10-01" }, { v: "3.1", date: "2009-06-27" }] };
  const unresolved = planWd(JSON.stringify(row) + "\n");
  assert.deepEqual(unresolved.series, []);
  assert.equal(unresolved.counts.series_unresolved, 2);
  const p = planWd(JSON.stringify(row) + "\n", "wikidata-evolution-cc0", WD, [{ slug: softwareSlug("Q28865"), kind: "software" }]);
  assert.deepEqual(p.series.map((s) => [s.year, s.value, s.metric]), [[2008, 2, "releases"], [2009, 1, "releases"]]);
  assert.match(p.series[0].runHash, /^[0-9a-f]{64}$/);
});

test("endoflife.date loads under its MIT rule and reads only release dates of mapped products", () => {
  const repoPath = "_intake/evolution/endoflife/fixture/python.json";
  const body = JSON.stringify({ result: { name: "python", releases: [{ name: "3.12", releaseDate: "2023-10-02", description: "not read" }, { name: "2.0", releaseDate: "2000-10-16" }] } }, null, 2);
  const mapped = new Map([["python", "software-wikidata-q28865"]]);
  const run = (map: Map<string, string>) =>
    planEvolution({
      sources: [{ repoPath, rule: "endoflife-mit", prior: 0.8 }],
      files: new Map([[repoPath, Buffer.from(body)]]),
      policy,
      nodes: [{ slug: "software-wikidata-q28865", kind: "software" }],
      edges: [],
      records: endoflifeRecords(map),
      series: endoflifeSeries(map),
    });
  const p = run(mapped);
  assert.equal(p.silver.length, 1);
  assert.equal(p.silver[0].text, "2000-10-16");
  assert.equal(p.silver[0].proposal.record, "python@2.0");
  assert.deepEqual(p.series.map((s) => [s.year, s.value]), [[2000, 1], [2023, 1]]);
  assert.equal(run(new Map()).silver.length, 0);
  assert.ok(!policy.index.some((r) => r.id === "endoflife-gate"));
});

test("the Software Atlas merge links nothing on name alone: every name match is a review candidate", () => {
  const tool = (name: string) => ({ name, field: "Proof", open: true }) as AtlasTool;
  const m = mergeSoftwareAtlas([tool("Lean 4"), tool("Rocq"), tool("GAP"), tool("lean 4")], [
    { slug: "software-wikidata-q1", title: "Lean 4", kind: "software" },
    { slug: "software-wikidata-q2", title: "GAP", kind: "software" },
    { slug: "software-wikidata-q3", title: "gap", kind: "software" },
    { slug: "concept-rocq", title: "Rocq", kind: "concept" },
  ]);
  assert.deepEqual(m.candidates, [
    { tool: "Lean 4", slugs: ["software-wikidata-q1"], reason: "one_name_match" },
    { tool: "GAP", slugs: ["software-wikidata-q2", "software-wikidata-q3"], reason: "several_name_matches" },
  ]);
  assert.ok(!("matched" in m));
  assert.deepEqual(m.proposals.map((p) => p.slug), [atlasSlug("Rocq")]);
  assert.equal(m.proposals[0].provenance.level, "application");
  assert.match(m.proposals[0].slug, /^[a-z0-9][a-z0-9-]{0,199}$/);
});

test("the real Software Atlas data yields valid slugs", () => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "research-os", "software-atlas-data.json"), "utf8")) as { tools: AtlasTool[] };
  const m = mergeSoftwareAtlas(data.tools, []);
  assert.ok(m.proposals.length > 0);
  for (const p of m.proposals) assert.match(p.slug, /^[a-z0-9][a-z0-9-]{0,199}$/, p.title);
  assert.equal(new Set(m.proposals.map((p) => p.slug)).size, m.proposals.length);
});

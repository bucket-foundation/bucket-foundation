import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parsePolicy } from "../src/lib/research-os/evidence/rights";
import { verifySilver, HIDE_BELOW } from "../src/lib/research-os/medallion/silver";
import { HISTORY_SOURCES, planHistory, valueSpan, type HistorySilver, type NodeRef } from "../src/lib/history/importer";

const ROOT = path.join(__dirname, "..");
const POLICY = parsePolicy(JSON.parse(readFileSync(path.join(ROOT, "learning", "research-os", "ai", "rights-policy.json"), "utf8")));

function realFiles(): Map<string, Uint8Array> {
  return new Map(HISTORY_SOURCES.map((s) => [s.repoPath, readFileSync(path.join(ROOT, s.repoPath))]));
}

function canonNodes(): NodeRef[] {
  const figures = JSON.parse(readFileSync(path.join(ROOT, "canon-figures/figures.json"), "utf8")).figures as { id: string; name: string }[];
  const sites = JSON.parse(readFileSync(path.join(ROOT, "src/data/canon-sites.json"), "utf8")).sites as { id: string; title: string }[];
  return [
    ...figures.map((f) => ({ slug: `figure-${f.id.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, title: f.name, kind: "figure" })),
    ...sites.map((s) => ({ slug: `site-${s.id.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, title: s.title, kind: "site" })),
  ];
}

function withFigures(figures: { id: string; name: string; lifespan: string }[]): Map<string, Uint8Array> {
  const files = realFiles();
  files.set("canon-figures/figures.json", Buffer.from(JSON.stringify({ figures }, null, 2)));
  return files;
}

function roleOf(items: HistorySilver[], record: string) {
  const found = items.filter((s) => s.proposal.record === record && s.proposal.source === "canon-figures/figures.json");
  assert.equal(found.length, 1, record);
  return found[0];
}

test("the real canon files plan the counts HISTORY-PLAN.md section 1 names", () => {
  const plan = planHistory({ files: realFiles(), policy: POLICY, nodes: canonNodes() });
  assert.equal(plan.counts.sites_parsed, 47);
  assert.equal(plan.counts.timeline_born, 58);
  assert.equal(plan.counts.timeline_composed, 54);
  assert.equal(plan.counts.timeline_occurred, 2);
  assert.equal(plan.counts.figures_born, 95);
  assert.equal(plan.counts.figures_died, 85);
  assert.equal(plan.counts.figures_flourished, 2);
  assert.equal(plan.counts.figures_composite, 2);
  assert.equal(plan.counts.bronze, 5);
  for (const s of plan.silver) {
    const b = plan.bronze.find((x) => x.sourceId === s.source_id)!;
    assert.ok(verifySilver(s, b.text), `${s.proposal.record} span does not hash to its bronze bytes`);
  }
});

test("each bronze source carries its rule, and the wikidata snapshot yields no silver", () => {
  const plan = planHistory({ files: realFiles(), policy: POLICY, nodes: canonNodes() });
  const rules = new Map(plan.bronze.map((b) => [b.repoPath, b.rights.rule]));
  assert.equal(rules.get("src/data/canon-timeline.json"), "canon-timeline");
  assert.equal(rules.get("canon-figures/figures.json"), "canon-figure");
  assert.equal(rules.get("src/data/canon-sites.json"), "canon-site");
  assert.equal(rules.get("_intake/history/wikidata-sacred/2026-09-23/timeline-events.jsonl"), "wikidata-cc0");
  assert.equal(rules.get("_intake/history/wikidata-sacred/2026-09-23/wikidata-sacred-events.json"), "wikidata-cc0");
  assert.ok(!plan.silver.some((s) => s.proposal.source.startsWith("_intake/history/")));
});

test("section 3.5 figure cases through the importer", () => {
  const plan = planHistory({
    files: withFigures([
      { id: "euclid", name: "Euclid", lifespan: "c.325-c.265 BCE" },
      { id: "marino", name: "Marino", lifespan: "1939-" },
      { id: "pollack", name: "Pollack", lifespan: "1939-" },
      { id: "watson-crick", name: "Watson and Crick", lifespan: "Watson 1928-, Crick 1916-2004" },
      { id: "newton", name: "Isaac Newton", lifespan: "1642-1727 (25 Dec 1642 OS \u2013 20 Mar 1727 OS)" },
      { id: "homer", name: "Homer", lifespan: "8th century BCE" },
    ]),
    policy: POLICY,
    nodes: [
      { slug: "figure-euclid", title: "Euclid", kind: "figure" },
      { slug: "figure-marino", title: "Marino", kind: "figure" },
      { slug: "figure-pollack", title: "Pollack", kind: "figure" },
      { slug: "figure-watson-crick", title: "Watson and Crick", kind: "figure" },
      { slug: "figure-newton", title: "Isaac Newton", kind: "figure" },
      { slug: "figure-homer", title: "Homer", kind: "figure" },
    ],
  });
  const euclid = roleOf(plan.silver, "euclid").proposal.roles;
  assert.deepEqual([euclid.born?.edtf, euclid.born?.start_min, euclid.born?.end_max], ["-0324~", -334, -314]);
  assert.deepEqual([euclid.died?.edtf, euclid.died?.start_min, euclid.died?.end_max], ["-0264~", -274, -254]);

  const marino = roleOf(plan.silver, "marino");
  const pollack = roleOf(plan.silver, "pollack");
  assert.deepEqual(Object.keys(marino.proposal.roles), ["born"]);
  assert.equal(marino.proposal.roles.born?.start_year, 1939);
  assert.notEqual(marino.span_start, pollack.span_start);
  assert.equal(marino.text_hash, pollack.text_hash);

  const composite = roleOf(plan.silver, "watson-crick");
  assert.equal(composite.proposal.refusal?.reason, "composite");
  assert.deepEqual(composite.proposal.roles, {});
  assert.ok(composite.confidence < HIDE_BELOW);
  assert.ok(!plan.promotions.some((p) => p.silver === composite));

  const newton = roleOf(plan.silver, "newton").proposal.roles;
  assert.equal(newton.born?.calendar, "julian-os");
  assert.deepEqual([newton.born?.start_min, newton.born?.start_max], [1642, 1643]);
  assert.deepEqual([newton.died?.end_min, newton.died?.end_max], [1727, 1728]);

  const homer = roleOf(plan.silver, "homer").proposal.roles;
  assert.deepEqual(Object.keys(homer), ["flourished"]);
  assert.equal(homer.flourished?.edtf, "-0799/-0700");
});

test("historical timeline years convert to astronomical, and -570 becomes -569", () => {
  const plan = planHistory({ files: realFiles(), policy: POLICY, nodes: canonNodes() });
  const pythagoras = plan.silver.find((s) => s.proposal.record === "pythagoras" && s.proposal.source === "src/data/canon-timeline.json")!;
  assert.equal(pythagoras.proposal.roles.born?.edtf, "-0569");
  assert.equal(pythagoras.proposal.roles.born?.place_slug, "bucket-timeline-pythagoras");
  const lascaux = plan.silver.find((s) => s.proposal.record === "lascaux")!;
  assert.equal(lascaux.proposal.roles.composed?.edtf, "Y-16999");
  assert.equal(lascaux.proposal.subject_resolved, false);
  const giza = plan.silver.find((s) => s.proposal.record === "giza-pyramids")!;
  assert.equal(giza.proposal.roles.founded?.start_year, -2559);
  assert.equal(giza.proposal.roles.founded?.place_slug, "bucket-site-giza-pyramids");
});

test("the better-sourced span takes preferred per role, and composites never absorb a birth", () => {
  const plan = planHistory({ files: realFiles(), policy: POLICY, nodes: canonNodes() });
  const galileo = plan.promotions.filter((p) => p.silver.subject === "figure-galileo");
  const fromTimeline = galileo.find((p) => p.silver.proposal.source === "src/data/canon-timeline.json")!;
  const fromFigures = galileo.find((p) => p.silver.proposal.source === "canon-figures/figures.json")!;
  assert.deepEqual(fromTimeline.preferredRoles, ["born"]);
  assert.deepEqual(fromFigures.preferredRoles, ["died"]);
  for (const record of ["crick", "watson-j", "hodgkin", "huxley-a"]) {
    const s = plan.silver.find((x) => x.proposal.record === record)!;
    assert.ok(!["figure-watson-crick", "figure-hodgkin-huxley"].includes(s.subject), `${record} attached to ${s.subject}`);
  }
});

test("unresolved subjects become node proposals and stay out of promotion", () => {
  const plan = planHistory({ files: realFiles(), policy: POLICY, nodes: canonNodes() });
  const kinds = new Map<string, number>();
  for (const p of plan.proposals) kinds.set(p.draft.kind, (kinds.get(p.draft.kind) ?? 0) + 1);
  assert.equal(kinds.get("primary_source"), 54);
  assert.equal(kinds.get("event"), 2);
  const promoted = new Set(plan.promotions.map((p) => p.silver));
  for (const p of plan.proposals) assert.ok(!promoted.has(p.silver), p.draft.slug);
});

test("a value span is found after its own record key", () => {
  const text = '{"rows": [{"id": "a", "lifespan": "1939-"}, {"id": "ab", "lifespan": "1939-"}]}';
  const a = valueSpan(text, "a", "lifespan")!;
  const ab = valueSpan(text, "ab", "lifespan")!;
  assert.equal(a.value, "1939-");
  assert.ok(ab.start > a.start);
  assert.equal(valueSpan(text, "missing", "lifespan"), null);
  assert.equal(valueSpan('{"id": "x", "name": "y"}, {"id": "z", "lifespan": "1"}', "x", "lifespan"), null);
});

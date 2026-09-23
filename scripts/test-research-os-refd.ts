import test from "node:test";
import assert from "node:assert/strict";
import { knownLinks, refd, refdAgreement, refdAucInterval, resolveTitles, scorePairs, wikiTitleFromUrl, type LinkIndex } from "../src/lib/research-os/refd";

test("titles come out of Wikipedia URLs with spaces and decoded characters", () => {
  assert.equal(wikiTitleFromUrl("https://en.wikipedia.org/wiki/Kinematics"), "Kinematics");
  assert.equal(wikiTitleFromUrl("https://en.wikipedia.org/wiki/Schr%C3%B6dinger_equation#Time"), "Schrödinger equation");
  assert.equal(wikiTitleFromUrl("https://en.m.wikipedia.org/wiki/Dot_product"), "Dot product");
  assert.equal(wikiTitleFromUrl("https://example.org/wiki/X"), null);
});

const idx = (o: Record<string, string[]>): LinkIndex => new Map(Object.entries(o).map(([k, v]) => [k, new Set(v)]));

test("a factor the target's neighbourhood leans on scores positive, and the reverse scores negative", () => {
  const links = idx({
    Kinematics: ["Derivative", "Velocity"],
    Velocity: ["Derivative", "Kinematics"],
    Derivative: ["Limit"],
    Limit: [],
  });
  const forward = refd("Derivative", "Kinematics", links)!;
  const backward = refd("Kinematics", "Derivative", links)!;
  assert.ok(forward > 0);
  assert.equal(backward, -forward);
});

test("no score without fetched neighbours or for the same article", () => {
  const links = idx({ A: ["Z"], B: ["Y"] });
  assert.equal(refd("A", "B", links), null);
  assert.equal(refd("A", "A", links), null);
  assert.equal(refd("A", "Missing", links), null);
});

test("the agreement tally counts only scored, decided pairs and ranks confirmed above refuted", () => {
  const t = refdAgreement([
    { refd: 0.2, verification: "confirmed" },
    { refd: 0.1, verification: "refuted" },
    { refd: -0.1, verification: "confirmed" },
    { refd: 0, verification: "refuted" },
    { refd: null, verification: "confirmed" },
    { refd: 0.3, verification: "unchecked" },
  ]);
  assert.equal(t.pairs, 4);
  assert.deepEqual(t.confirmed, { positive: 1, zero: 0, negative: 1, mean: 0.05 });
  assert.deepEqual(t.refuted, { positive: 1, zero: 1, negative: 0, mean: 0.05 });
  assert.equal(t.auc, 0.5);
  assert.equal(refdAgreement([{ refd: 0.2, verification: "confirmed" }]).auc, null);
  assert.equal(refdAgreement([{ refd: 0.2, verification: "confirmed" }, { refd: 0.2, verification: "refuted" }]).auc, 0.5);
});

test("titles resolve through normalisation and redirects, and disambiguation pages drop out", () => {
  const r = resolveTitles(["kinematics", "Speed of light in vacuum", "Set", "Nope"], {
    normalized: [{ from: "kinematics", to: "Kinematics" }],
    redirects: [{ from: "Speed of light in vacuum", to: "Speed of light" }],
    pages: [
      { title: "Kinematics" },
      { title: "Speed of light" },
      { title: "Set", pageprops: { disambiguation: "" } },
      { title: "Nope", missing: true },
    ],
  });
  assert.equal(r.get("kinematics"), "Kinematics");
  assert.equal(r.get("Speed of light in vacuum"), "Speed of light");
  assert.equal(r.get("Set"), null);
  assert.equal(r.get("Nope"), null);
});

test("raw links map through aliases onto known articles only", () => {
  const raw = new Map([
    ["Kinematics", ["Differentiation (mathematics)", "Velocity", "Galileo Galilei", "Kinematics"]],
    ["Derivative", ["Limit (mathematics)"]],
    ["Velocity", ["Derivative"]],
  ]);
  const links = knownLinks(raw, new Map([["Differentiation (mathematics)", "Derivative"]]));
  assert.deepEqual(Array.from(links.get("Kinematics")!).sort(), ["Derivative", "Velocity"]);
  assert.deepEqual(Array.from(links.get("Derivative")!), []);
});

test("pairs score only when both ends have an article", () => {
  const links = knownLinks(
    new Map([
      ["Kinematics", ["Derivative", "Velocity"]],
      ["Velocity", ["Derivative", "Kinematics"]],
      ["Derivative", []],
    ]),
    new Map(),
  );
  const titleOf = new Map([
    ["academy-02-physics-kinematics", "Kinematics"],
    ["academy-01-mathematics-derivative", "Derivative"],
  ]);
  const s = scorePairs(
    [
      { from_slug: "academy-01-mathematics-derivative", to_slug: "academy-02-physics-kinematics" },
      { from_slug: "concept-set", to_slug: "academy-02-physics-kinematics" },
    ],
    titleOf,
    links,
  );
  assert.equal(s.size, 1);
  assert.ok(s.get("academy-01-mathematics-derivative->academy-02-physics-kinematics")! > 0);
});

test("the ROC area gets a target-level interval that repeats run to run and does not depend on row order", () => {
  const rows = ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9", "t10", "t11", "t12"].flatMap((t, i) => [
    { target: t, refd: 0.1 + i * 0.01, verification: "confirmed" },
    { target: t, refd: i % 2 ? 0.2 : -0.1, verification: "refuted" },
    { target: t, refd: null, verification: "confirmed" },
  ]);
  const a = refdAucInterval(rows, 400);
  const b = refdAucInterval(rows.slice().reverse(), 400);
  assert.deepEqual(a, b);
  assert.equal(a.targets, 12);
  assert.ok(a.auc !== null && a.interval !== null);
  assert.ok(a.interval![0] <= a.auc! && a.auc! <= a.interval![1]);
  assert.deepEqual(refdAucInterval([{ target: "t", refd: 0.1, verification: "confirmed" }]), { auc: null, interval: null, targets: 1, confirmed: 1, refuted: 0 });
  const few = refdAucInterval(rows.filter((r) => r.verification === "refuted" || ["t1", "t2", "t3"].includes(r.target)));
  assert.ok(few.auc !== null);
  assert.equal(few.interval, null);
  assert.equal(few.confirmed, 3);
});

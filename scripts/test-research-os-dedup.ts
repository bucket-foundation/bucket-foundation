import test from "node:test";
import assert from "node:assert/strict";
import { chooseKeeper, findMergeCandidates, matchBundleParts, normalizeTitle, splitBundle, titleSimilarity, type DedupNode } from "../src/lib/research-os/dedup";

const n = (slug: string, title: string, branch: string, degree = 1, tier = 13): DedupNode => ({ id: slug, slug, title, branch, kind: "concept", tier, degree });

test("normalizeTitle folds case, accents, punctuation and parentheticals", () => {
  assert.equal(normalizeTitle("Deuterium-depleted water (DDW)"), "deuterium depleted water");
  assert.equal(normalizeTitle("Gödel's incompleteness theorems"), "godel s incompleteness theorems");
  assert.equal(normalizeTitle("  Goldman–Hodgkin–Katz  "), "goldman hodgkin katz");
});

test("titleSimilarity folds plurals and ignores stop words", () => {
  assert.equal(titleSimilarity("Inner product spaces", "Inner product space"), 1);
  assert.equal(titleSimilarity("The equivalence principle", "Equivalence principle"), 1);
  assert.ok(titleSimilarity("Entropy", "Entropy production") < 0.8);
  assert.equal(titleSimilarity("", "Anything"), 0);
});

test("the keeper has more edges, then the lower tier, then the earlier slug", () => {
  assert.equal(chooseKeeper(n("a", "X", "p", 5), n("b", "X", "q", 2))[0].slug, "a");
  assert.equal(chooseKeeper(n("a", "X", "p", 2, 20), n("b", "X", "q", 2, 13))[0].slug, "b");
  assert.equal(chooseKeeper(n("b", "X", "p"), n("a", "X", "q"))[0].slug, "a");
});

test("same titles across branches pair once, with the keeper chosen", () => {
  const nodes = [n("phys-ep", "Equivalence principle", "02-physics", 6), n("cos-ep", "Equivalence principle", "06-cosmology", 3), n("other", "Inertia", "02-physics")];
  const c = findMergeCandidates(nodes);
  assert.equal(c.length, 1);
  assert.deepEqual([c[0].keepSlug, c[0].dropSlug, c[0].reason, c[0].similarity], ["phys-ep", "cos-ep", "same_title", 1]);
});

test("a verifier refusal that calls a pair a duplicate wins over the title match", () => {
  const nodes = [n("phys-ep", "Equivalence principle", "02-physics", 6), n("cos-ep", "Equivalence principle", "06-cosmology", 3)];
  const c = findMergeCandidates(nodes, [
    { fromSlug: "phys-ep", toSlug: "cos-ep", text: "This is the same concept listed in another branch, so it looks like a duplicate node to merge." },
  ]);
  assert.equal(c.length, 1);
  assert.equal(c[0].reason, "verifier_duplicate");
  assert.match(c[0].evidence, /duplicate node/);
});

test("a refusal without duplicate wording is ignored", () => {
  const nodes = [n("a", "Gravitation", "02-physics"), n("b", "Equivalence principle", "06-cosmology")];
  assert.equal(findMergeCandidates(nodes, [{ fromSlug: "a", toSlug: "b", text: "You need Newtonian gravity first." }]).length, 0);
});

test("near titles pair above the threshold, and one-word titles never do", () => {
  const nodes = [n("a", "Inner product spaces", "01-mathematics"), n("b", "Inner product space", "04-information"), n("c", "Entropy", "02-physics"), n("d", "Entropy production", "05-biophysics")];
  const c = findMergeCandidates(nodes);
  assert.deepEqual(c.map((x) => [x.reason, [x.keepSlug, x.dropSlug].sort().join("+"), x.similarity]), [["near_title", "a+b", 1]]);
  const near = findMergeCandidates([n("a", "Gibbs free energy change", "03-chemistry"), n("b", "Gibbs free energy changes", "05-biophysics")]);
  assert.equal(near.length, 1);
});

test("splitBundle splits on commas and and, and leaves single names alone", () => {
  assert.deepEqual(splitBundle("Vector spaces, bases and inner products"), ["Vector spaces", "bases", "inner products"]);
  assert.deepEqual(splitBundle("Amino acids and the peptide bond"), ["Amino acids", "the peptide bond"]);
  assert.deepEqual(splitBundle("Causality and the Kramers-Kronig relations (dispersion)"), ["Causality", "the Kramers-Kronig relations"]);
  assert.deepEqual(splitBundle("Thermodynamics"), []);
});

test("matchBundleParts finds the nodes a bundle names", () => {
  const nodes = [n("vs", "Vector spaces", "01-mathematics"), n("ips", "Inner product spaces", "01-mathematics"), n("ent", "Entropy", "02-physics")];
  const m = matchBundleParts("Vector spaces, bases and inner products", nodes);
  assert.deepEqual(m.map((x) => [x.part, x.slug]), [["Vector spaces", "vs"], ["inner products", "ips"]]);
  assert.equal(m[0].similarity, 1);
  assert.deepEqual(matchBundleParts("Thermodynamics", nodes), []);
});

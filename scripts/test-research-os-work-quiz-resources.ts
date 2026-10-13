import test from "node:test";
import assert from "node:assert/strict";
import { EVIDENCE_ANCHOR, LEARN_LABEL, packLearnAtoms, resourceForFact, resourceForQuestion } from "../src/lib/research-os/work-quiz/resources";
import { compoundFactId } from "../src/lib/research-os/work-quiz/fact";
import { FACT_KINDS } from "../src/lib/research-os/work-quiz/fact";
import { SOURCE_KINDS } from "../src/lib/research-os/work-quiz/types";

test("an atom links to its Learn lesson", () => {
  assert.deepEqual(resourceForFact("atom:01-mathematics/prime-numbers"), { label: LEARN_LABEL, href: "/research-os/learn/01-mathematics/prime-numbers" });
});

test("an excerpt links to its page and the evidence passage", () => {
  assert.deepEqual(resourceForFact("excerpt:photosynthesis/chlorophyll-a%3Ab"), { label: LEARN_LABEL, href: `/excerpts/photosynthesis/chlorophyll-a%3Ab#${EVIDENCE_ANCHOR}` });
});

test("a paper fact links to its source page", () => {
  assert.equal(resourceForFact("work:d/10.1023/a%3A1025493705728")?.href, "https://doi.org/10.1023/a:1025493705728");
  assert.equal(resourceForFact("work:p/12345")?.href, "https://pubmed.ncbi.nlm.nih.gov/12345/");
  assert.equal(resourceForFact("work:a/2101.00001")?.href, "https://arxiv.org/abs/2101.00001");
  assert.equal(resourceForFact("work:o/W2741809807")?.href, "https://openalex.org/W2741809807");
});

test("a compound fact id resolves to its first teachable part", () => {
  assert.equal(resourceForFact(compoundFactId(["pr:12", "atom:02-physics/entropy"]))?.href, "/research-os/learn/02-physics/entropy");
});

test("unknown, work-only and malformed ids give null", () => {
  for (const id of ["", "pr:412", "bead:bkt-5x89", "note:a.md#h", "chat:x", "count:beads-status-open", "word:fr:chat", "atom:", "atom:deck", "atom:/slug", "atom:deck/", "excerpt:bare-slug", "work:bkt-0123456789ab", "work:zz/1", "work:d/%E0%A4%A", "nonsense", "unknown:a/b", "atom:%E0%A4%A/x"]) {
    assert.equal(resourceForFact(id), null, id);
  }
});

test("a question resolves through its sources", () => {
  const sources = [
    { kind: "pr" as const, ref: "#9", label: "x", href: null },
    { kind: "atom" as const, ref: "07-mind/memory", label: "Memory", href: null },
  ];
  assert.equal(resourceForQuestion({ sources, explain: "" })?.href, "/research-os/learn/07-mind/memory");
  assert.equal(resourceForQuestion({ sources: [], explain: "" }), null);
});

test("the new kinds are known to facts and sources", () => {
  for (const k of ["atom", "excerpt", "work"]) {
    assert.ok(FACT_KINDS.includes(k as (typeof FACT_KINDS)[number]));
    assert.ok(SOURCE_KINDS.includes(k as (typeof SOURCE_KINDS)[number]));
  }
});

test("a question with no teachable source falls back to its stored lesson, then to a match on its text", () => {
  const q = { sources: [{ kind: "pr" as const, ref: "#9", label: "x", href: null }], explain: "Entropy and thermodynamics decide the direction." };
  assert.deepEqual(resourceForQuestion({ ...q, learn: { href: "/research-os/learn/02-physics/entropy", title: "Entropy" } }), { label: LEARN_LABEL, href: "/research-os/learn/02-physics/entropy" });
  const atoms = packLearnAtoms({ "02-physics": [{ id: "entropy", title: "Entropy and thermodynamics" }] });
  assert.equal(resourceForQuestion(q, atoms)?.href, "/research-os/learn/02-physics/entropy");
  assert.equal(resourceForQuestion(q), null);
});

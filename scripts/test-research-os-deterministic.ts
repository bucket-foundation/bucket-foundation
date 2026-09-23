import { strict as assert } from "node:assert";
import { test } from "node:test";
import { deterministicCheck, deterministicOrganize, isCopy, llmEnabled, overlap } from "../src/lib/research-os/deterministic";

const quote = {
  quotable_span: "Sunlight is scattered by the molecules of the air, and blue light is scattered more than red because of its shorter wavelength.",
  citation: "Rayleigh 1871",
};

test("llmEnabled defaults off and reads the switch", () => {
  assert.equal(llmEnabled({}), false);
  assert.equal(llmEnabled({ RESEARCH_OS_LLM_ENABLED: "0" }), false);
  assert.equal(llmEnabled({ RESEARCH_OS_LLM_ENABLED: "true" }), true);
  assert.equal(llmEnabled({ RESEARCH_OS_LLM_ENABLED: "1" }), true);
});

test("no quotes: abstains and asks for one", () => {
  const r = deterministicCheck({ explanation: "The sky is blue because air scatters blue light more.", quotes: [], verdict: "support" });
  assert.equal(r.abstained, true);
  assert.equal(r.result, "unknown");
  assert.deepEqual(r.citations, []);
});

test("no verdict: abstains and asks for one, keeps the citations", () => {
  const r = deterministicCheck({ explanation: "The sky is blue because air scatters blue light more.", quotes: [quote], verdict: null });
  assert.equal(r.abstained, true);
  assert.deepEqual(r.citations, ["Rayleigh 1871"]);
});

test("own words drawing on the quote: graded with the learner's verdict", () => {
  const r = deterministicCheck({
    explanation: "The sky looks blue because the air's molecules scatter blue light more than red light, since blue has a shorter wavelength.",
    quotes: [quote],
    verdict: "support",
  });
  assert.equal(r.abstained, false);
  assert.equal(r.result, "support");
  assert.equal(r.confidence, "medium", "one quote caps at medium");
  assert.match(r.feedback, /Recorded as support/);
  const two = deterministicCheck({
    explanation: "The sky looks blue because the air's molecules scatter blue light more than red light, since blue has a shorter wavelength.",
    quotes: [quote, { quotable_span: "Blue light has a shorter wavelength than red light.", citation: "Textbook" }],
    verdict: "contradiction",
  });
  assert.equal(two.result, "contradiction");
  assert.equal(two.confidence, "high");
  assert.deepEqual(two.citations, ["Rayleigh 1871", "Textbook"]);
});

test("a copied quote is not graded", () => {
  const r = deterministicCheck({ explanation: quote.quotable_span as string, quotes: [quote], verdict: "support" });
  assert.equal(r.abstained, true);
  assert.equal(r.result, "unknown");
  assert.match(r.feedback, /own words/);
  assert.equal(isCopy("short", [quote.quotable_span as string]), false);
});

test("an explanation unrelated to the quotes is not graded", () => {
  const r = deterministicCheck({ explanation: "Volcanoes erupt when magma pressure exceeds the strength of the crust above it.", quotes: [quote], verdict: "support" });
  assert.equal(r.abstained, true);
  assert.match(r.feedback, /terms from the passages/);
  assert.ok(overlap("blue light scattered air", quote.quotable_span as string) > 0.9);
});

test("organize splits the learner's own notes and adds nothing", () => {
  const r = deterministicOrganize({
    claim: "The sky is blue because of scattering. This is my claim.",
    evidenceNotes: "- blue scatters more than red\n- shorter wavelength scatters more",
    sourceNotes: "Rayleigh 1871; Textbook chapter 4",
  });
  assert.equal(r.claim, "The sky is blue because of scattering.");
  assert.deepEqual(r.evidence, ["blue scatters more than red", "shorter wavelength scatters more"]);
  assert.deepEqual(r.sources, ["Rayleigh 1871", "Textbook chapter 4"]);
  assert.equal(r.abstained, false);
  assert.deepEqual(deterministicOrganize({ claim: "", evidenceNotes: "", sourceNotes: "" }), { claim: "", evidence: [], sources: [], abstained: false });
});

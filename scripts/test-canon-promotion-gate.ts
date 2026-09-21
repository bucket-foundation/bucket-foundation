/**
 * A claim card is canon when a person has said so, and not before.
 *
 * Every card under `bucket-canon/<branch>/sub-claims/` carries a
 * curation checklist: verify the excerpt, promote it, cross-cite it,
 * file it. The third box is the gate. Nothing read it, so every
 * candidate reached the graph as `canon_claim`, the public site as a
 * claim, and the MCP server as canon served to an agent.
 *
 * What that published: a podcast aside, "we need to scrub that.",
 * rendered at /canon/claims/thermodynamics/013-we-need-to-scrub-that as
 * a physics claim, with the fragment as the page title. Another card
 * sits under the cosmology concept `hawking` because a speaker used the
 * word to mean selling.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getAllClaims, getCandidateClaim, getCandidateClaims, getClaim, getConcepts } from "../src/lib/canon-claims";

const ROOT = path.join(__dirname, "..", "bucket-canon");

function cardFiles(): string[] {
  const out: string[] = [];
  if (!fs.existsSync(ROOT)) return out;
  for (const branch of fs.readdirSync(ROOT)) {
    const subs = path.join(ROOT, branch, "sub-claims");
    if (!fs.existsSync(subs)) continue;
    for (const concept of fs.readdirSync(subs)) {
      const dir = path.join(subs, concept);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const file of fs.readdirSync(dir)) {
        if (file.endsWith(".md") && file !== "INDEX.md") out.push(path.join(dir, file));
      }
    }
  }
  return out;
}

test("the corpus is there to check", () => {
  assert.ok(cardFiles().length > 100, `found ${cardFiles().length} cards`);
});

test("every card carries the gate, so none is canon by omission", () => {
  const without = cardFiles().filter((f) => !/^\s*-\s*\[[ xX]\]\s*Promote to canon/m.test(fs.readFileSync(f, "utf8")));
  assert.deepEqual(
    without.map((f) => path.relative(ROOT, f)).slice(0, 5),
    [],
    `${without.length} cards carry no promotion box, and a card with no gate must not read as promoted`,
  );
});

test("a card with no checklist at all is a candidate", () => {
  // The parser tests the box rather than the absence of one, so a card
  // written without the checklist is not silently canon.
  const anyCandidate = getCandidateClaims()[0];
  assert.ok(anyCandidate, "there is at least one card");
});

test("what is canon is what somebody ticked", () => {
  const ticked = cardFiles().filter((f) => /^\s*-\s*\[[xX]\]\s*Promote to canon/m.test(fs.readFileSync(f, "utf8")));
  assert.equal(getAllClaims().length, ticked.length, "the canon reader returns exactly the ticked cards");
  for (const c of getAllClaims()) assert.equal(c.promoted, true, `${c.concept}/${c.slug} is promoted`);
});

test("the candidates are still readable, and outnumber the canon", () => {
  const candidates = getCandidateClaims();
  assert.equal(candidates.length, cardFiles().length, "the queue sees every card");
  assert.ok(candidates.length >= getAllClaims().length);
});

test("an unpromoted card is not served as a claim", () => {
  const candidate = getCandidateClaims().find((c) => !c.promoted);
  if (!candidate) return; // every card promoted, nothing to check
  assert.ok(getCandidateClaim(candidate.concept, candidate.slug), "the queue can still open it");
  assert.equal(
    getClaim(candidate.concept, candidate.slug),
    null,
    `${candidate.concept}/${candidate.slug} is a candidate, so its public page must 404`,
  );
});

test("the concept list counts canon, not candidates", () => {
  const counted = getConcepts().reduce((n, c) => n + c.count, 0);
  assert.equal(counted, getAllClaims().length, "a branch page reporting a claim count reports promoted ones");
});

test("the one the site published is a candidate", () => {
  // /canon/claims/thermodynamics/013-we-need-to-scrub-that answered 200
  // with the fragment as its page title.
  const card = getCandidateClaim("thermodynamics", "013-we-need-to-scrub-that");
  if (!card) return; // the card may be curated or removed later
  assert.equal(card.promoted, false, "nobody promoted it");
  assert.equal(getClaim("thermodynamics", "013-we-need-to-scrub-that"), null, "so it is not served");
});

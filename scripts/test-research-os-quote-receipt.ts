import test from "node:test";
import assert from "node:assert/strict";
import {
  curatedQuotePayload,
  curatedSourceId,
  curatedSourceRevision,
  type CuratedQuoteSource,
} from "../src/lib/research-os/quote-receipt";

const NODE = "4b1d7a52-0000-4000-8000-000000000001";
const source: CuratedQuoteSource = {
  nodeId: NODE,
  slug: "why-the-sky-is-blue",
  title: "Why the sky is blue",
  text: "Scattering goes as the inverse fourth power of the wavelength.",
  locator: "p. 12",
  citation: "Rayleigh, 1871, Phil. Mag.",
};

test("a source id survives a rename, because it carries the node id", () => {
  assert.equal(curatedSourceId(NODE), `graph:${NODE}`);
  const renamed = { ...source, slug: "sky-colour", title: "Sky colour" };
  assert.equal(curatedQuotePayload(renamed, "s").sourceId, curatedQuotePayload(source, "s").sourceId);
  assert.equal(
    curatedQuotePayload(renamed, "s").sourceRevision,
    curatedQuotePayload(source, "s").sourceRevision,
    "a rename is not an edit to what was quoted",
  );
});

test("the revision changes when the quoted material changes", () => {
  const base = curatedSourceRevision(source);
  assert.notEqual(curatedSourceRevision({ ...source, text: source.text + " " }), base, "an edit to the span");
  assert.notEqual(curatedSourceRevision({ ...source, locator: "p. 13" }), base, "a move to another locator");
  assert.notEqual(curatedSourceRevision({ ...source, citation: "Rayleigh, 1899" }), base, "a change of attribution");
  assert.equal(curatedSourceRevision({ ...source }), base, "and nothing else does");
});

test("the same quotation in the same sitting is one idempotency key", () => {
  const first = curatedQuotePayload(source, "session-a");
  const again = curatedQuotePayload({ ...source }, "session-a");
  assert.equal(first.idempotencyKey, again.idempotencyKey, "a retry is recognized");
  assert.equal(first.payloadHash, again.payloadHash);
});

test("a different sitting, or a different span, is a different key", () => {
  const key = (s: CuratedQuoteSource, session: string | null) => curatedQuotePayload(s, session).idempotencyKey;
  const base = key(source, "session-a");
  assert.notEqual(key(source, "session-b"), base, "a second sitting quotes again");
  assert.notEqual(key({ ...source, locator: "p. 13" }, "session-a"), base, "another locator is another quotation");
  assert.notEqual(key({ ...source, text: "Something else entirely." }, "session-a"), base, "another span too");
});

test("a Quote with no session still collapses a repeat within one request", () => {
  assert.equal(curatedQuotePayload(source, null).idempotencyKey, curatedQuotePayload(source, null).idempotencyKey);
  assert.notEqual(
    curatedQuotePayload(source, null).idempotencyKey,
    curatedQuotePayload(source, "session-a").idempotencyKey,
    "and a sitting is still distinct from no sitting",
  );
});

test("every hash is a sha256 hex digest, and the passage id names its locator", () => {
  const p = curatedQuotePayload(source, "session-a");
  for (const [name, value] of [["sourceRevision", p.sourceRevision], ["textHash", p.textHash], ["payloadHash", p.payloadHash], ["idempotencyKey", p.idempotencyKey]] as const) {
    assert.match(value, /^[0-9a-f]{64}$/, `${name} is a sha256 hex digest`);
  }
  assert.equal(p.passageId, `graph:${NODE}#p. 12`);
  assert.equal(p.sourceNodeId, NODE);
  assert.equal(p.locator, "p. 12");
});

test("the payload hash covers the material, so a conflict is detectable", () => {
  const base = curatedQuotePayload(source, "session-a").payloadHash;
  assert.notEqual(curatedQuotePayload({ ...source, text: "different" }, "session-a").payloadHash, base);
  assert.notEqual(curatedQuotePayload({ ...source, locator: "p. 99" }, "session-a").payloadHash, base);
});

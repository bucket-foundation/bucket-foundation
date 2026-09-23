import { strict as assert } from "node:assert";
import { test } from "node:test";
import { consentPathFor, effectiveConsent, payeeFor } from "../src/lib/research-os/consent-paths";
import { consentBlockedBody, consentRefusal, decideConsent, decideWithPaths, type ConsentCheckResult } from "../src/lib/research-os/consent";

const under13 = { birthYearBucket: "under13" as const, consentStatus: "none" as const, consentSource: null };
const schoolClass = { classId: "c1", consentBasis: "school" as const, consentDocument: "district NDPA exhibit E" };
const plainClass = { classId: "c2", consentBasis: "none" as const, consentDocument: null };

test("adults need no consent; a profile consent wins over the paths", () => {
  assert.deepEqual(effectiveConsent({ birthYearBucket: "18plus", consentStatus: "none", consentSource: null }, [], [], []), { status: "self", source: "adult", path: "adult" });
  assert.deepEqual(effectiveConsent({ ...under13, consentStatus: "parent", consentSource: "vpc 8f2c" }, [], [], []), { status: "parent", source: "vpc 8f2c", path: "profile" });
  assert.equal(effectiveConsent(null, [], [], []).status, "none");
});

test("the school exception covers a rostered learner in a class with basis school", () => {
  const r = effectiveConsent(under13, [{ classId: "c1", role: "learner" }], [schoolClass, plainClass], []);
  assert.equal(r.status, "school");
  assert.equal(r.path, "school");
  assert.match(r.source ?? "", /exhibit E/);
  assert.equal(effectiveConsent(under13, [{ classId: "c2", role: "learner" }], [schoolClass, plainClass], []).status, "none", "a class without the basis covers no one");
  assert.equal(effectiveConsent(under13, [{ classId: "c1", role: "parent" }], [schoolClass], []).status, "none", "only learner memberships count");
});

test("a verified vendor request reads as parent consent; pending or declined does not", () => {
  assert.equal(effectiveConsent(under13, [], [], [{ vendor: "privo", status: "verified", vendorRef: "p-1" }]).status, "parent");
  assert.equal(effectiveConsent(under13, [], [], [{ vendor: "privo", status: "verified", vendorRef: "p-1" }]).source, "privo p-1");
  assert.equal(effectiveConsent(under13, [], [], [{ vendor: "kid", status: "pending" }]).status, "none");
  assert.equal(effectiveConsent(under13, [], [], [{ vendor: "manual", status: "declined" }]).status, "none");
});

test("consentPathFor", () => {
  assert.equal(consentPathFor(null, false), "ask_age");
  assert.equal(consentPathFor("18plus", false), "none_needed");
  assert.equal(consentPathFor("under13", true), "school");
  assert.equal(consentPathFor("under13", false), "vendor");
  assert.equal(consentPathFor("13to17", false), "vendor");
});

test("payee: minors through a guardian or a custodial account only", () => {
  assert.deepEqual(payeeFor({ birthYearBucket: null, payeeType: null, guardianContactHash: null }), { ok: false, reason: "age_unknown" });
  assert.deepEqual(payeeFor({ birthYearBucket: "18plus", payeeType: null, guardianContactHash: null }), { ok: true, payee: "self" });
  assert.deepEqual(payeeFor({ birthYearBucket: "13to17", payeeType: "self", guardianContactHash: null }), { ok: false, reason: "guardian_required" });
  assert.deepEqual(payeeFor({ birthYearBucket: "under13", payeeType: "guardian", guardianContactHash: null }), { ok: false, reason: "guardian_contact_required" });
  assert.deepEqual(payeeFor({ birthYearBucket: "under13", payeeType: "guardian", guardianContactHash: "abc" }), { ok: true, payee: "guardian" });
  assert.deepEqual(payeeFor({ birthYearBucket: "13to17", payeeType: "custodial", guardianContactHash: null }), { ok: true, payee: "custodial" });
});

test("a consent path read that fails is unavailable, and answers 503", () => {
  const blocked: ConsentCheckResult = { allowed: false, reason: "unavailable", message: "Consent could not be checked right now." };
  const refusal = consentRefusal(blocked);
  assert.equal(refusal.status, 503, "a read that did not complete is not a claim about the learner");
  assert.equal((refusal.body as { error: string }).error, "consent_unavailable");

  const required: ConsentCheckResult = { allowed: false, reason: "consent_required", message: "needs consent" };
  assert.equal(consentRefusal(required).status, 403, "a real refusal stays a 403");
  assert.equal((consentRefusal(required).body as { error: string }).error, "consent_required");

  assert.throws(() => consentBlockedBody(blocked), /consentRefusal/, "the 403 body refuses to shape a 503");
});

test("requireConsent reports unavailable when a path read raises", async () => {
  const profile = { learnerId: "l1", role: "student" as const, birthYearBucket: "under13" as const, consentStatus: "none" as const, consentSource: null, updatedAt: "" };
  const first = decideConsent(profile, "probe_answer");
  assert.equal(first.reason, "consent_required", "the fixture reaches the path lookup");

  const thrown = await decideWithPaths("l1", profile, "probe_answer", async () => {
    throw new Error("class_members read failed");
  }, async () => {});
  assert.equal(thrown.allowed, false);
  assert.equal(thrown.reason, "unavailable", "a raise becomes a named outcome rather than a 500");

  const served = await decideWithPaths("l1", profile, "probe_answer", async () => ({ status: "school" as const, source: "district", path: "school" as const }), async () => {});
  assert.equal(served.allowed, true, "and a path that resolves still admits the learner");
});

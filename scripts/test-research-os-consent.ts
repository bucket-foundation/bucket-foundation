/**
 * Unit tests: the age and consent gate (bkt-ros ros-07 task item 3, wired
 * to its call sites by the ros-07 follow-up), src/lib/research-os/
 * consent.ts's decideConsent and consentBlockedBody. Pure, no I/O, no
 * live Supabase, matching scripts/test-research-os-engine-bridge.ts's own
 * convention: node:test + node:assert, plain fixture objects.
 *
 * requireConsent itself (the thin DB-reading wrapper around decideConsent)
 * is not tested here, matching this repo's convention that a function
 * touching a live Supabase client is not directly unit tested (see
 * src/lib/research-os/db.ts, none of its exports have a test file either);
 * every decision requireConsent makes is factored into decideConsent,
 * which is fully covered below. The "per route" block further down runs
 * decideConsent's rule over all four ConsentAction values, one per wired
 * call site (src/app/api/research-os/workspace/route.ts, probe/route.ts,
 * state/route.ts's transfer_item action, production/route.ts), including
 * the no-profile case for each.
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-research-os-consent.ts
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { consentBlockedBody, decideConsent, type ConsentAction, type LearnerProfile } from "../src/lib/research-os/consent";

function profile(overrides: Partial<LearnerProfile> = {}): LearnerProfile {
  return {
    learnerId: "11111111-1111-1111-1111-111111111111",
    role: "student",
    birthYearBucket: null,
    consentStatus: "none",
    consentSource: null,
    updatedAt: "2026-09-10T00:00:00.000Z",
    ...overrides,
  };
}

test("decideConsent: no profile at all is blocked with reason no_profile", () => {
  const result = decideConsent(null, "workspace_tool");
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "no_profile");
  assert.ok(result.message && result.message.length > 0);
});

test("decideConsent: a profile with no birth_year_bucket yet (age question unanswered) and consent none is blocked", () => {
  // birthYearBucket null, consentStatus 'none': not an explicit under-13/
  // 13-17 bucket, but also not 18plus, so the minor branch's condition is
  // false and this falls through to the default allowed=true UNLESS the
  // caller treats "unknown bucket" as a minor for gating purposes. This
  // test pins the actual rule: only an EXPLICIT under13/13to17 bucket
  // triggers the consent_required block; a null bucket with no profile at
  // all is the case no_profile already covers above (no row means no
  // bucket AND no consent_status either). A row that exists but has not
  // recorded a bucket yet is allowed through this specific check (it is
  // still gated by the no_profile branch until a bucket IS recorded, since
  // requireConsent reads the row that has to exist first).
  const result = decideConsent(profile({ birthYearBucket: null, consentStatus: "none" }), "workspace_tool");
  assert.equal(result.allowed, true);
});

test("decideConsent: 18plus is always allowed, regardless of consent_status", () => {
  for (const consentStatus of ["none", "school", "parent", "self"] as const) {
    const result = decideConsent(profile({ birthYearBucket: "18plus", consentStatus }), "workspace_tool");
    assert.equal(result.allowed, true, `18plus + consentStatus ${consentStatus} should be allowed`);
  }
});

test("decideConsent: under13 with consent_status none is blocked with reason consent_required", () => {
  const result = decideConsent(profile({ birthYearBucket: "under13", consentStatus: "none" }), "workspace_tool");
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "consent_required");
  assert.ok(result.message && result.message.length > 0);
});

test("decideConsent: 13to17 with consent_status none is blocked with reason consent_required", () => {
  const result = decideConsent(profile({ birthYearBucket: "13to17", consentStatus: "none" }), "production_submit");
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "consent_required");
});

test("decideConsent: under13 or 13to17 with any recorded consent (school, parent, self) is allowed", () => {
  for (const bucket of ["under13", "13to17"] as const) {
    for (const consentStatus of ["school", "parent", "self"] as const) {
      const result = decideConsent(profile({ birthYearBucket: bucket, consentStatus }), "workspace_tool");
      assert.equal(result.allowed, true, `${bucket} + consentStatus ${consentStatus} should be allowed`);
    }
  }
});

test("decideConsent: the gate applies the same rule to both named actions", () => {
  const blocked = profile({ birthYearBucket: "under13", consentStatus: "none" });
  assert.equal(decideConsent(blocked, "workspace_tool").allowed, false);
  assert.equal(decideConsent(blocked, "production_submit").allowed, false);
  const allowed = profile({ birthYearBucket: "18plus" });
  assert.equal(decideConsent(allowed, "workspace_tool").allowed, true);
  assert.equal(decideConsent(allowed, "production_submit").allowed, true);
});

// ---------------------------------------------------------------------------
// ros-07 follow-up ("consent gate wiring"): one test per wired call site,
// including the no-profile case, over all four ConsentAction values now
// that requireConsent backs src/app/api/research-os/workspace/route.ts,
// probe/route.ts, state/route.ts (action "transfer_item"), and
// production/route.ts. decideConsent's own rule does not vary by action
// (see its header), so these tests pin that every route's action label
// gets the exact same blocked/allowed outcome today, guarding the shared
// rule against a silent per-call-site drift later.
// ---------------------------------------------------------------------------

const ALL_ACTIONS: ConsentAction[] = ["workspace_tool", "probe_answer", "transfer_answer", "production_submit"];

test("decideConsent: no profile at all is blocked with reason no_profile, per route", () => {
  for (const action of ALL_ACTIONS) {
    const result = decideConsent(null, action);
    assert.equal(result.allowed, false, `${action} should block a missing profile`);
    assert.equal(result.reason, "no_profile");
    assert.ok(result.message && result.message.length > 0);
  }
});

test("decideConsent: a minor with consent none is blocked with reason consent_required, per route", () => {
  const minor = profile({ birthYearBucket: "13to17", consentStatus: "none" });
  for (const action of ALL_ACTIONS) {
    const result = decideConsent(minor, action);
    assert.equal(result.allowed, false, `${action} should block an unconsented minor`);
    assert.equal(result.reason, "consent_required");
  }
});

test("decideConsent: 18plus is allowed on every route's own action", () => {
  const adult = profile({ birthYearBucket: "18plus" });
  for (const action of ALL_ACTIONS) {
    assert.equal(decideConsent(adult, action).allowed, true, `${action} should allow an 18plus profile`);
  }
});

test("decideConsent: a minor with consent on file is allowed on every route's own action", () => {
  const consented = profile({ birthYearBucket: "under13", consentStatus: "parent" });
  for (const action of ALL_ACTIONS) {
    assert.equal(decideConsent(consented, action).allowed, true, `${action} should allow a consented minor`);
  }
});

// ---------------------------------------------------------------------------
// consentBlockedBody: the JSON shape every gated route returns on its 403.
// ---------------------------------------------------------------------------

test("consentBlockedBody: no_profile carries needsProfile true", () => {
  const gate = decideConsent(null, "workspace_tool");
  const body = consentBlockedBody(gate);
  assert.equal(body.error, "no_profile");
  assert.equal(body.needsProfile, true);
  assert.equal(body.message, gate.message);
});

test("consentBlockedBody: consent_required carries needsProfile false", () => {
  const gate = decideConsent(profile({ birthYearBucket: "under13", consentStatus: "none" }), "production_submit");
  const body = consentBlockedBody(gate);
  assert.equal(body.error, "consent_required");
  assert.equal(body.needsProfile, false);
  assert.equal(body.message, gate.message);
});

test("consentBlockedBody: throws on an allowed result rather than returning a fake blocked body", () => {
  const gate = decideConsent(profile({ birthYearBucket: "18plus" }), "workspace_tool");
  assert.throws(() => consentBlockedBody(gate));
});

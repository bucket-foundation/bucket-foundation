import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isValidBirthYearBucket, isValidRole, validateProfileInput } from "../src/lib/research-os/profile";

test("validateProfileInput: a valid role and bucket pass, and round-trip unchanged", () => {
  const result = validateProfileInput({ role: "student", birthYearBucket: "13to17" });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.role, "student");
    assert.equal(result.value.birthYearBucket, "13to17");
  }
});

test("validateProfileInput: every valid role is accepted", () => {
  for (const role of ["student", "teacher", "independent"] as const) {
    const result = validateProfileInput({ role, birthYearBucket: "18plus" });
    assert.equal(result.ok, true, `role ${role} should validate`);
  }
});

test("validateProfileInput: every valid birth-year bucket is accepted", () => {
  for (const bucket of ["under13", "13to17", "18plus"] as const) {
    const result = validateProfileInput({ role: "student", birthYearBucket: bucket });
    assert.equal(result.ok, true, `bucket ${bucket} should validate`);
  }
});

test("validateProfileInput: a missing role fails with an error naming the field", () => {
  const result = validateProfileInput({ birthYearBucket: "18plus" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /role/);
});

test("validateProfileInput: a missing birthYearBucket fails with an error naming the field", () => {
  const result = validateProfileInput({ role: "student" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /birthYearBucket/);
});

test("validateProfileInput: an unrecognized role value fails, even a near-miss", () => {
  const result = validateProfileInput({ role: "guardian", birthYearBucket: "18plus" });
  assert.equal(result.ok, false);
});

test("validateProfileInput: an unrecognized bucket value fails, even a plausible-looking one", () => {
  const result = validateProfileInput({ role: "student", birthYearBucket: "12" });
  assert.equal(result.ok, false);
});

test("validateProfileInput: a non-string role or bucket fails rather than coercing", () => {
  assert.equal(validateProfileInput({ role: 1 as unknown as string, birthYearBucket: "18plus" }).ok, false);
  assert.equal(validateProfileInput({ role: "student", birthYearBucket: true as unknown as string }).ok, false);
});

test("validateProfileInput: an empty body fails on the role check first", () => {
  const result = validateProfileInput({});
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /role/);
});

test("validateProfileInput: a successful result carries only role and birthYearBucket", () => {
  const result = validateProfileInput({ role: "student", birthYearBucket: "under13", consentStatus: "self" } as never);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(Object.keys(result.value).sort(), ["birthYearBucket", "role"]);
  }
});

test("isValidRole / isValidBirthYearBucket: agree with validateProfileInput's own acceptance", () => {
  assert.equal(isValidRole("teacher"), true);
  assert.equal(isValidRole("admin"), false);
  assert.equal(isValidBirthYearBucket("under13"), true);
  assert.equal(isValidBirthYearBucket("adult"), false);
});

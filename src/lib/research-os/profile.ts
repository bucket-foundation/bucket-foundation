/**
 * Research OS for K-12, the learner profile form's input validation
 * (bkt-ros ros-07 follow-up, "consent gate wiring"). Backs POST/GET
 * /api/research-os/profile (src/app/api/research-os/profile/route.ts)
 * and the minimal /research-os/profile page (src/app/research-os/profile/
 * page.tsx): a learner's own role and a coarse birth-year bucket, nothing
 * else. Pure, no I/O, matching this repo's consent.ts/privacy.ts
 * convention: the decision logic is a plain function tested with fixture
 * objects (scripts/test-research-os-profile.ts); the route stays a thin
 * wrapper around it.
 *
 * Deliberately validates ONLY role and birthYearBucket. consent_status is
 * not an accepted field here, by type: this form is not a consent form.
 * compliance/README.md part B item 2 (the school/parent consent path) is
 * the only writer of graph.learner_profiles.consent_status, and stays a
 * TODO pending the VPC vendor choice named there; a learner filling out
 * this form must never be able to set their own consent status, and the
 * route this validator backs upserts only the two columns
 * validateProfileInput returns, so an existing consent_status is never
 * touched by a later profile edit.
 */
import type { BirthYearBucket, LearnerRole } from "./consent";

const VALID_ROLES = new Set<LearnerRole>(["student", "teacher", "independent"]);
const VALID_BUCKETS = new Set<BirthYearBucket>(["under13", "13to17", "18plus"]);

export interface ProfileInput {
  role: LearnerRole;
  birthYearBucket: BirthYearBucket;
}

export type ProfileValidationResult = { ok: true; value: ProfileInput } | { ok: false; error: string };

/** Human-readable labels for the birth-year bucket, shared by the profile
 * page so its options read as plain language rather than the raw column
 * values. No birthdate, no exact age: the bucket is the coarsest fact the
 * gate needs (consent.ts's own header explains why). */
export const BIRTH_YEAR_BUCKET_LABELS: Record<BirthYearBucket, string> = {
  under13: "under 13",
  "13to17": "13 to 17",
  "18plus": "18 or older",
};

export const ROLE_LABELS: Record<LearnerRole, string> = {
  student: "student",
  teacher: "teacher",
  independent: "independent adult learner",
};

export function isValidRole(value: unknown): value is LearnerRole {
  return typeof value === "string" && VALID_ROLES.has(value as LearnerRole);
}

export function isValidBirthYearBucket(value: unknown): value is BirthYearBucket {
  return typeof value === "string" && VALID_BUCKETS.has(value as BirthYearBucket);
}

/**
 * Validates a profile submission body. Rejects anything other than the two
 * accepted fields being present and well-formed; does not look at or
 * accept a consent_status field at all, even if a caller sent one, since
 * this function's return type has no slot for it.
 */
export function validateProfileInput(body: { role?: unknown; birthYearBucket?: unknown }): ProfileValidationResult {
  if (!isValidRole(body.role)) {
    return { ok: false, error: "role must be one of student, teacher, independent" };
  }
  if (!isValidBirthYearBucket(body.birthYearBucket)) {
    return { ok: false, error: "birthYearBucket must be one of under13, 13to17, 18plus" };
  }
  return { ok: true, value: { role: body.role, birthYearBucket: body.birthYearBucket } };
}

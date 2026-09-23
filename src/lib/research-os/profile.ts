import type { BirthYearBucket, LearnerRole } from "./consent";

const VALID_ROLES = new Set<LearnerRole>(["student", "teacher", "independent"]);
const VALID_BUCKETS = new Set<BirthYearBucket>(["under13", "13to17", "18plus"]);

export interface ProfileInput {
  role: LearnerRole;
  birthYearBucket: BirthYearBucket;
}

export type ProfileValidationResult = { ok: true; value: ProfileInput } | { ok: false; error: string };

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

export function validateProfileInput(body: { role?: unknown; birthYearBucket?: unknown }): ProfileValidationResult {
  if (!isValidRole(body.role)) {
    return { ok: false, error: "role must be one of student, teacher, independent" };
  }
  if (!isValidBirthYearBucket(body.birthYearBucket)) {
    return { ok: false, error: "birthYearBucket must be one of under13, 13to17, 18plus" };
  }
  return { ok: true, value: { role: body.role, birthYearBucket: body.birthYearBucket } };
}

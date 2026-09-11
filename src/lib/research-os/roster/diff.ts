/**
 * Research OS for K-12, roster sync (bkt-ros, ros-06 follow-on). The pure
 * diff engine: takes one parsed RosterBundle (oneroster.ts, or a future
 * Clever/ClassLink adapter, see sources.ts) plus a snapshot of what
 * already exists, and returns what would change, with no I/O. Matches
 * this repo's own convention (src/lib/research-os/class-view.ts,
 * src/lib/research-os/privacy.ts's simulateLearnerDelete) of keeping the
 * decision logic testable against plain fixture arrays; src/lib/research-
 * os/roster/apply.ts is the thin, untested-by-unit-test Supabase adapter
 * that loads a real RosterExistingState, calls computeRosterDiff, and
 * writes the result.
 *
 * See ROSTER.md for the full field-mapping table, what gets discarded,
 * and the idempotency keys named here.
 */
import type { BirthYearBucket } from "../consent";
import { gradeToBirthYearBucket } from "./grade";
import type { RosterBundle, RosterUser } from "./types";

export interface ExistingClass {
  id: string;
  sourceSystem: string | null;
  sourcedId: string | null;
  name: string;
  reviewerEmail: string;
}
export interface ExistingReviewerCandidate {
  sourceSystem: string;
  sourcedId: string;
  email: string;
  name: string | null;
  status: "pending" | "approved" | "rejected";
}
export interface ExistingLearnerProfile {
  learnerId: string;
  role: string;
  birthYearBucket: string | null;
}

/** Everything computeRosterDiff needs to know about the current database
 * state. src/lib/research-os/roster/apply.ts's loadRosterExistingState
 * builds this from Supabase; scripts/test-research-os-roster.ts builds it
 * from plain fixture arrays. authUserIdByEmail is the one deliberate
 * boundary this importer respects: a student or teacher with no matching
 * Supabase Auth account is never created here (see ROSTER.md, "what is
 * discarded") -- this map is the only way a roster row ever resolves to a
 * real learner_id. */
export interface RosterExistingState {
  classes: ExistingClass[];
  classMemberKeys: Set<string>;
  reviewerCandidates: ExistingReviewerCandidate[];
  authUserIdByEmail: Map<string, string>;
  learnerProfiles: ExistingLearnerProfile[];
}

export function emptyRosterState(): RosterExistingState {
  return { classes: [], classMemberKeys: new Set(), reviewerCandidates: [], authUserIdByEmail: new Map(), learnerProfiles: [] };
}

export function classMemberKey(classSourcedId: string, learnerId: string): string {
  return `${classSourcedId}::${learnerId}`;
}

export interface ClassUpsert {
  sourcedId: string;
  name: string;
  reviewerEmail: string;
}
export interface ClassUnresolved {
  sourcedId: string;
  title: string;
  reason: "no_teacher_enrollment";
}
export interface ClassMemberCreate {
  classSourcedId: string;
  learnerEmail: string;
  learnerId: string;
}
export interface ClassMemberSkipped {
  enrollmentSourcedId: string;
  classSourcedId: string;
  userSourcedId: string;
  reason: "unknown_class" | "learner_not_registered";
}
export interface ReviewerCandidateUpsert {
  sourcedId: string;
  email: string;
  name: string;
}
export interface LearnerProfileUpsert {
  learnerId: string;
  sourcedId: string;
  email: string;
  birthYearBucket: BirthYearBucket | null;
}
export interface LearnerProfileSkipped {
  sourcedId: string;
  email: string;
  reason: "learner_not_registered" | "existing_role_not_student";
}

export interface RosterDiff {
  sourceSystem: string;
  counts: {
    orgsParsed: number;
    usersParsed: number;
    classesParsed: number;
    enrollmentsParsed: number;
    classesToCreate: number;
    classesToUpdate: number;
    classesUnresolved: number;
    classMembersToCreate: number;
    classMembersAlreadyPresent: number;
    classMembersSkipped: number;
    reviewerCandidatesToCreate: number;
    reviewerCandidatesToUpdate: number;
    learnerProfilesToCreate: number;
    learnerProfilesToUpdate: number;
    learnerProfilesSkipped: number;
  };
  classes: { create: ClassUpsert[]; update: ClassUpsert[]; unresolved: ClassUnresolved[] };
  classMembers: { create: ClassMemberCreate[]; skipped: ClassMemberSkipped[] };
  reviewerCandidates: { create: ReviewerCandidateUpsert[]; update: ReviewerCandidateUpsert[] };
  learnerProfiles: { create: LearnerProfileUpsert[]; update: LearnerProfileUpsert[]; skipped: LearnerProfileSkipped[] };
  warnings: string[];
}

function fullName(u: { givenName: string; familyName: string }): string {
  return [u.givenName, u.familyName].filter(Boolean).join(" ").trim();
}

/** For a given class sourcedId, the teacher enrollment that resolves its
 * reviewer_email: a primary=true teacher enrollment wins over any other;
 * failing that, the first teacher enrollment found (bundle order). */
function resolveClassTeacherEmail(
  classSourcedId: string,
  bundle: RosterBundle,
  usersBySourcedId: Map<string, RosterUser>,
): string | null {
  const candidates = bundle.enrollments.filter((e) => e.classSourcedId === classSourcedId && e.role === "teacher");
  if (candidates.length === 0) return null;
  const primary = candidates.find((e) => e.primary) ?? candidates[0];
  const user = usersBySourcedId.get(primary.userSourcedId);
  return user?.email ?? null;
}

/**
 * Computes the diff. No I/O, no throw: every row-level problem this
 * function finds (an enrollment against an unrecognized class, a student
 * with no matching Supabase Auth account yet) becomes an entry in the
 * relevant `skipped`/`unresolved` list plus a `warnings` line, never an
 * exception -- the caller (the API route) always gets a full diff back to
 * show a reviewer, dry run or not.
 */
export function computeRosterDiff(bundle: RosterBundle, existing: RosterExistingState): RosterDiff {
  const warnings: string[] = [];
  const usersBySourcedId = new Map(bundle.users.map((u) => [u.sourcedId, u]));
  const existingClassBySourced = new Map(
    existing.classes.filter((c) => c.sourceSystem === bundle.sourceSystem && c.sourcedId).map((c) => [c.sourcedId as string, c]),
  );
  const existingCandidateBySourced = new Map(
    existing.reviewerCandidates.filter((c) => c.sourceSystem === bundle.sourceSystem).map((c) => [c.sourcedId, c]),
  );
  const existingProfileByLearnerId = new Map(existing.learnerProfiles.map((p) => [p.learnerId, p]));

  // ---- classes ----------------------------------------------------------
  const classCreate: ClassUpsert[] = [];
  const classUpdate: ClassUpsert[] = [];
  const classUnresolved: ClassUnresolved[] = [];
  const resolvableClassSourcedIds = new Set<string>();

  for (const c of bundle.classes) {
    const reviewerEmail = resolveClassTeacherEmail(c.sourcedId, bundle, usersBySourcedId);
    const existingRow = existingClassBySourced.get(c.sourcedId);
    if (!reviewerEmail) {
      if (existingRow) {
        // Already synced once with a resolvable teacher; a bundle that
        // now omits every teacher enrollment for it does not un-teach the
        // class. Keep it resolvable (existing reviewer_email stands) and
        // only flag if the title changed.
        resolvableClassSourcedIds.add(c.sourcedId);
        if (existingRow.name !== c.title) classUpdate.push({ sourcedId: c.sourcedId, name: c.title, reviewerEmail: existingRow.reviewerEmail });
        continue;
      }
      classUnresolved.push({ sourcedId: c.sourcedId, title: c.title, reason: "no_teacher_enrollment" });
      warnings.push(`class ${c.sourcedId} ("${c.title}") has no teacher enrollment in this bundle; not created`);
      continue;
    }
    resolvableClassSourcedIds.add(c.sourcedId);
    if (!existingRow) {
      classCreate.push({ sourcedId: c.sourcedId, name: c.title, reviewerEmail });
    } else if (existingRow.name !== c.title || existingRow.reviewerEmail.toLowerCase() !== reviewerEmail.toLowerCase()) {
      classUpdate.push({ sourcedId: c.sourcedId, name: c.title, reviewerEmail });
    }
  }

  // ---- reviewer candidates (teachers) ------------------------------------
  const candidateCreate: ReviewerCandidateUpsert[] = [];
  const candidateUpdate: ReviewerCandidateUpsert[] = [];
  const seenTeacherSourcedIds = new Set<string>();
  for (const u of bundle.users) {
    if (u.role !== "teacher" || seenTeacherSourcedIds.has(u.sourcedId)) continue;
    seenTeacherSourcedIds.add(u.sourcedId);
    const name = fullName(u);
    const existingRow = existingCandidateBySourced.get(u.sourcedId);
    if (!existingRow) {
      candidateCreate.push({ sourcedId: u.sourcedId, email: u.email, name });
    } else if (existingRow.email.toLowerCase() !== u.email.toLowerCase() || (existingRow.name ?? "") !== name) {
      candidateUpdate.push({ sourcedId: u.sourcedId, email: u.email, name });
    }
  }

  // ---- learner profiles (students) --------------------------------------
  const profileCreate: LearnerProfileUpsert[] = [];
  const profileUpdate: LearnerProfileUpsert[] = [];
  const profileSkipped: LearnerProfileSkipped[] = [];
  const seenStudentSourcedIds = new Set<string>();
  for (const u of bundle.users) {
    if (u.role !== "student" || seenStudentSourcedIds.has(u.sourcedId)) continue;
    seenStudentSourcedIds.add(u.sourcedId);
    const learnerId = existing.authUserIdByEmail.get(u.email);
    if (!learnerId) {
      profileSkipped.push({ sourcedId: u.sourcedId, email: u.email, reason: "learner_not_registered" });
      warnings.push(`student ${u.sourcedId} (${u.email}) has no matching Supabase Auth account; learner_profiles not written`);
      continue;
    }
    const bucket = gradeToBirthYearBucket(u.grades);
    const existingProfile = existingProfileByLearnerId.get(learnerId);
    if (existingProfile && existingProfile.role !== "student" && existingProfile.role !== "independent") {
      profileSkipped.push({ sourcedId: u.sourcedId, email: u.email, reason: "existing_role_not_student" });
      warnings.push(`learner ${learnerId} already has role="${existingProfile.role}"; roster sync will not overwrite it with "student"`);
      continue;
    }
    const upsert: LearnerProfileUpsert = { learnerId, sourcedId: u.sourcedId, email: u.email, birthYearBucket: bucket };
    if (!existingProfile) {
      profileCreate.push(upsert);
    } else {
      const roleChanges = existingProfile.role !== "student";
      const bucketChanges = bucket !== null && bucket !== existingProfile.birthYearBucket;
      if (roleChanges || bucketChanges) profileUpdate.push(upsert);
    }
  }

  // ---- class members (enrollments) ---------------------------------------
  const memberCreate: ClassMemberCreate[] = [];
  const memberSkipped: ClassMemberSkipped[] = [];
  let memberAlreadyPresent = 0;
  const seenMemberPairs = new Set<string>();
  for (const e of bundle.enrollments) {
    if (e.role !== "student") continue; // a teacher enrollment feeds reviewer_candidates instead, above
    const pairKey = `${e.classSourcedId}::${e.userSourcedId}`;
    if (seenMemberPairs.has(pairKey)) continue; // duplicate enrollment row for the same (class, user)
    seenMemberPairs.add(pairKey);

    if (!resolvableClassSourcedIds.has(e.classSourcedId)) {
      memberSkipped.push({ enrollmentSourcedId: e.sourcedId, classSourcedId: e.classSourcedId, userSourcedId: e.userSourcedId, reason: "unknown_class" });
      warnings.push(`enrollment ${e.sourcedId} references unknown class ${e.classSourcedId}; not inserted`);
      continue;
    }
    const user = usersBySourcedId.get(e.userSourcedId);
    const learnerId = user ? existing.authUserIdByEmail.get(user.email) : undefined;
    if (!learnerId) {
      memberSkipped.push({ enrollmentSourcedId: e.sourcedId, classSourcedId: e.classSourcedId, userSourcedId: e.userSourcedId, reason: "learner_not_registered" });
      continue;
    }
    const existingRow = existingClassBySourced.get(e.classSourcedId);
    if (existingRow && existing.classMemberKeys.has(classMemberKey(existingRow.id, learnerId))) {
      memberAlreadyPresent++;
      continue;
    }
    memberCreate.push({ classSourcedId: e.classSourcedId, learnerEmail: user!.email, learnerId });
  }

  return {
    sourceSystem: bundle.sourceSystem,
    counts: {
      orgsParsed: bundle.orgs.length,
      usersParsed: bundle.users.length,
      classesParsed: bundle.classes.length,
      enrollmentsParsed: bundle.enrollments.length,
      classesToCreate: classCreate.length,
      classesToUpdate: classUpdate.length,
      classesUnresolved: classUnresolved.length,
      classMembersToCreate: memberCreate.length,
      classMembersAlreadyPresent: memberAlreadyPresent,
      classMembersSkipped: memberSkipped.length,
      reviewerCandidatesToCreate: candidateCreate.length,
      reviewerCandidatesToUpdate: candidateUpdate.length,
      learnerProfilesToCreate: profileCreate.length,
      learnerProfilesToUpdate: profileUpdate.length,
      learnerProfilesSkipped: profileSkipped.length,
    },
    classes: { create: classCreate, update: classUpdate, unresolved: classUnresolved },
    classMembers: { create: memberCreate, skipped: memberSkipped },
    reviewerCandidates: { create: candidateCreate, update: candidateUpdate },
    learnerProfiles: { create: profileCreate, update: profileUpdate, skipped: profileSkipped },
    warnings,
  };
}

/**
 * A pure, offline mirror of what src/lib/research-os/roster/apply.ts does
 * to the database, folding one already-computed RosterDiff into a
 * RosterExistingState to produce the state a second dry run would see --
 * the same "offline-testable mirror" pattern src/lib/research-os/
 * privacy.ts's simulateLearnerDelete already uses for a live SQL function
 * this repo's test suite cannot reach. scripts/test-research-os-roster.ts
 * uses this to assert "apply twice yields no change" with no database.
 * Fabricates a synthetic class id (`class:<sourcedId>`) for a newly
 * created class -- opaque and stable across a test's two calls, which is
 * all this function's own callers need from it; the real apply.ts uses
 * Supabase's own generated uuid instead.
 */
export function applyRosterDiffToState(existing: RosterExistingState, diff: RosterDiff): RosterExistingState {
  const classes = existing.classes.map((c) => ({ ...c }));
  const classIdBySourced = new Map(classes.filter((c) => c.sourceSystem === diff.sourceSystem && c.sourcedId).map((c) => [c.sourcedId as string, c]));

  for (const c of diff.classes.create) {
    const row: ExistingClass = { id: `class:${c.sourcedId}`, sourceSystem: diff.sourceSystem, sourcedId: c.sourcedId, name: c.name, reviewerEmail: c.reviewerEmail };
    classes.push(row);
    classIdBySourced.set(c.sourcedId, row);
  }
  for (const c of diff.classes.update) {
    const row = classIdBySourced.get(c.sourcedId);
    if (row) {
      row.name = c.name;
      row.reviewerEmail = c.reviewerEmail;
    }
  }

  const classMemberKeys = new Set(existing.classMemberKeys);
  for (const m of diff.classMembers.create) {
    const row = classIdBySourced.get(m.classSourcedId);
    if (row) classMemberKeys.add(classMemberKey(row.id, m.learnerId));
  }

  const reviewerCandidates = existing.reviewerCandidates.map((c) => ({ ...c }));
  const candidateBySourced = new Map(reviewerCandidates.filter((c) => c.sourceSystem === diff.sourceSystem).map((c) => [c.sourcedId, c]));
  for (const c of diff.reviewerCandidates.create) {
    const row: ExistingReviewerCandidate = { sourceSystem: diff.sourceSystem, sourcedId: c.sourcedId, email: c.email, name: c.name, status: "pending" };
    reviewerCandidates.push(row);
    candidateBySourced.set(c.sourcedId, row);
  }
  for (const c of diff.reviewerCandidates.update) {
    const row = candidateBySourced.get(c.sourcedId);
    if (row) {
      row.email = c.email;
      row.name = c.name;
      // status is deliberately untouched, matching apply.ts's own rule.
    }
  }

  const learnerProfiles = existing.learnerProfiles.map((p) => ({ ...p }));
  const profileByLearnerId = new Map(learnerProfiles.map((p) => [p.learnerId, p]));
  for (const p of diff.learnerProfiles.create) {
    const row: ExistingLearnerProfile = { learnerId: p.learnerId, role: "student", birthYearBucket: p.birthYearBucket };
    learnerProfiles.push(row);
    profileByLearnerId.set(p.learnerId, row);
  }
  for (const p of diff.learnerProfiles.update) {
    const row = profileByLearnerId.get(p.learnerId);
    if (row) {
      row.role = "student";
      if (p.birthYearBucket !== null) row.birthYearBucket = p.birthYearBucket;
    }
  }

  return { classes, classMemberKeys, reviewerCandidates, authUserIdByEmail: existing.authUserIdByEmail, learnerProfiles };
}

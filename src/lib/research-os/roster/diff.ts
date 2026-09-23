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

  const classCreate: ClassUpsert[] = [];
  const classUpdate: ClassUpsert[] = [];
  const classUnresolved: ClassUnresolved[] = [];
  const resolvableClassSourcedIds = new Set<string>();

  for (const c of bundle.classes) {
    const reviewerEmail = resolveClassTeacherEmail(c.sourcedId, bundle, usersBySourcedId);
    const existingRow = existingClassBySourced.get(c.sourcedId);
    if (!reviewerEmail) {
      if (existingRow) {
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

  const memberCreate: ClassMemberCreate[] = [];
  const memberSkipped: ClassMemberSkipped[] = [];
  let memberAlreadyPresent = 0;
  const seenMemberPairs = new Set<string>();
  for (const e of bundle.enrollments) {
    if (e.role !== "student") continue;
    const pairKey = `${e.classSourcedId}::${e.userSourcedId}`;
    if (seenMemberPairs.has(pairKey)) continue;
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

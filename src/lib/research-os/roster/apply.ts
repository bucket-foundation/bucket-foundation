/**
 * Research OS for K-12, roster sync (bkt-ros, ros-06 follow-on). The live
 * Supabase adapter around diff.ts's pure computeRosterDiff: loads the
 * current graph.classes/class_members/reviewer_candidates/learner_profiles
 * state plus a Supabase Auth email index, and, once a reviewer has seen
 * the resulting diff and asked to apply it, writes it. Never imported
 * from a client component, matching src/lib/research-os/db.ts's own rule.
 *
 * Like every other live-Supabase write path in this repo
 * (src/lib/research-os/db.ts's writeProductionOutbox,
 * graph.privacy_delete_learner), this file runs no test against a real
 * Postgres; scripts/test-research-os-roster.ts exercises computeRosterDiff
 * and applyRosterDiffToState (diff.ts) instead, the same "pure logic
 * tested, live adapter reviewed by hand" split TEACHER-LAYER.md's own
 * "what this suite does not cover" section describes.
 */
import { graphService, publicService } from "../db";
import { classMemberKey, type ExistingClass, type ExistingLearnerProfile, type ExistingReviewerCandidate, type RosterDiff, type RosterExistingState } from "./diff";

interface ClassRow {
  id: string;
  name: string;
  reviewer_email: string;
  source_system: string | null;
  sourced_id: string | null;
}
interface ClassMemberRow {
  class_id: string;
  learner_id: string;
}
interface ReviewerCandidateRow {
  source_system: string;
  sourced_id: string;
  email: string;
  name: string | null;
  status: "pending" | "approved" | "rejected";
}
interface LearnerProfileRow {
  learner_id: string;
  role: string;
  birth_year_bucket: string | null;
}

/**
 * Pages through Supabase Auth's admin listUsers to build a lowercased
 * email -> user id index. Phase-1-scale (a pilot's worth of accounts, the
 * same scale ClassRow's own comment in db.ts names for graph.classes);
 * a district-scale deployment would need this replaced with a
 * per-email lookup or a materialized index rather than a full scan on
 * every roster sync, left as a TODO for whichever bead first hits it.
 */
async function loadAuthUserIdsByEmail(): Promise<Map<string, string>> {
  const svc = publicService();
  const out = new Map<string, string>();
  const perPage = 1000;
  for (let page = 1; ; page++) {
    const { data, error } = await svc.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`loadAuthUserIdsByEmail: listUsers failed: ${error.message}`);
    const users = data?.users ?? [];
    for (const u of users) {
      if (u.email) out.set(u.email.toLowerCase(), u.id);
    }
    if (users.length < perPage) break;
  }
  return out;
}

export async function loadRosterExistingState(): Promise<RosterExistingState> {
  const svc = graphService();

  const { data: classRows, error: classErr } = await svc.from("classes").select("id,name,reviewer_email,source_system,sourced_id");
  if (classErr) throw new Error(`loadRosterExistingState: classes query failed: ${classErr.message}`);
  const classes: ExistingClass[] = ((classRows as ClassRow[]) || []).map((r) => ({
    id: r.id,
    sourceSystem: r.source_system,
    sourcedId: r.sourced_id,
    name: r.name,
    reviewerEmail: r.reviewer_email,
  }));

  const classMemberKeys = new Set<string>();
  const classIds = classes.map((c) => c.id);
  if (classIds.length > 0) {
    const { data: memberRows, error: memberErr } = await svc.from("class_members").select("class_id,learner_id").in("class_id", classIds);
    if (memberErr) throw new Error(`loadRosterExistingState: class_members query failed: ${memberErr.message}`);
    for (const r of (memberRows as ClassMemberRow[]) || []) classMemberKeys.add(classMemberKey(r.class_id, r.learner_id));
  }

  const { data: candidateRows, error: candidateErr } = await svc.from("reviewer_candidates").select("source_system,sourced_id,email,name,status");
  if (candidateErr) throw new Error(`loadRosterExistingState: reviewer_candidates query failed: ${candidateErr.message}`);
  const reviewerCandidates: ExistingReviewerCandidate[] = ((candidateRows as ReviewerCandidateRow[]) || []).map((r) => ({
    sourceSystem: r.source_system,
    sourcedId: r.sourced_id,
    email: r.email,
    name: r.name,
    status: r.status,
  }));

  const { data: profileRows, error: profileErr } = await svc.from("learner_profiles").select("learner_id,role,birth_year_bucket");
  if (profileErr) throw new Error(`loadRosterExistingState: learner_profiles query failed: ${profileErr.message}`);
  const learnerProfiles: ExistingLearnerProfile[] = ((profileRows as LearnerProfileRow[]) || []).map((r) => ({
    learnerId: r.learner_id,
    role: r.role,
    birthYearBucket: r.birth_year_bucket,
  }));

  const authUserIdByEmail = await loadAuthUserIdsByEmail();

  return { classes, classMemberKeys, reviewerCandidates, authUserIdByEmail, learnerProfiles };
}

export interface RosterApplyResult {
  classesWritten: number;
  classMembersWritten: number;
  reviewerCandidatesWritten: number;
  learnerProfilesWritten: number;
}

/**
 * Writes a RosterDiff. Order matters: classes first (class_members needs
 * their real ids), then class_members, then reviewer_candidates and
 * learner_profiles (independent of the other two).
 *
 * reviewer_candidates status is never reset by this function: `create`
 * rows insert with status "pending" (graph.reviewer_candidates' own
 * column default); `update` rows touch only email/name via a plain
 * UPDATE, never an upsert that would carry a "pending" status back over
 * an already-approved or -rejected row. See ROSTER.md, "the approval
 * flow for reviewer candidates."
 *
 * learner_profiles is written in two batches, with and without a
 * resolved birth_year_bucket, so a student whose grades field this sync
 * cannot map to a bucket never has an existing bucket value overwritten
 * with null (an upsert only touches the columns present in its own
 * payload; omitting the column entirely, rather than sending it as null,
 * is what leaves an existing value alone).
 */
export async function applyRosterImport(diff: RosterDiff): Promise<RosterApplyResult> {
  const svc = graphService();

  const classUpserts = [...diff.classes.create, ...diff.classes.update];
  const classIdBySourced = new Map<string, string>();
  if (classUpserts.length > 0) {
    const rows = classUpserts.map((c) => ({ source_system: diff.sourceSystem, sourced_id: c.sourcedId, name: c.name, reviewer_email: c.reviewerEmail }));
    const { data, error } = await svc.from("classes").upsert(rows, { onConflict: "source_system,sourced_id" }).select("id,sourced_id");
    if (error) throw new Error(`applyRosterImport: classes upsert failed: ${error.message}`);
    for (const r of (data as { id: string; sourced_id: string }[]) || []) classIdBySourced.set(r.sourced_id, r.id);
  }

  // class_members can also reference a class that already existed before
  // this sync and was not touched above (its title/teacher were
  // unchanged); resolve those ids with one extra select.
  const neededSourcedIds = Array.from(new Set(diff.classMembers.create.map((m) => m.classSourcedId))).filter((id) => !classIdBySourced.has(id));
  if (neededSourcedIds.length > 0) {
    const { data, error } = await svc.from("classes").select("id,sourced_id").eq("source_system", diff.sourceSystem).in("sourced_id", neededSourcedIds);
    if (error) throw new Error(`applyRosterImport: class id resolution failed: ${error.message}`);
    for (const r of (data as { id: string; sourced_id: string }[]) || []) classIdBySourced.set(r.sourced_id, r.id);
  }

  const memberRows = diff.classMembers.create
    .map((m) => ({ class_id: classIdBySourced.get(m.classSourcedId), learner_id: m.learnerId }))
    .filter((r): r is { class_id: string; learner_id: string } => Boolean(r.class_id));
  if (memberRows.length > 0) {
    const { error } = await svc.from("class_members").upsert(memberRows, { onConflict: "class_id,learner_id", ignoreDuplicates: true });
    if (error) throw new Error(`applyRosterImport: class_members upsert failed: ${error.message}`);
  }

  if (diff.reviewerCandidates.create.length > 0) {
    const rows = diff.reviewerCandidates.create.map((c) => ({ source_system: diff.sourceSystem, sourced_id: c.sourcedId, email: c.email, name: c.name, status: "pending" as const }));
    const { error } = await svc.from("reviewer_candidates").upsert(rows, { onConflict: "source_system,sourced_id" });
    if (error) throw new Error(`applyRosterImport: reviewer_candidates insert failed: ${error.message}`);
  }
  for (const c of diff.reviewerCandidates.update) {
    const { error } = await svc.from("reviewer_candidates").update({ email: c.email, name: c.name }).eq("source_system", diff.sourceSystem).eq("sourced_id", c.sourcedId);
    if (error) throw new Error(`applyRosterImport: reviewer_candidates update failed (${c.sourcedId}): ${error.message}`);
  }

  const profileUpserts = [...diff.learnerProfiles.create, ...diff.learnerProfiles.update];
  const withBucket = profileUpserts.filter((p) => p.birthYearBucket !== null);
  const withoutBucket = profileUpserts.filter((p) => p.birthYearBucket === null);
  if (withBucket.length > 0) {
    const rows = withBucket.map((p) => ({ learner_id: p.learnerId, role: "student" as const, birth_year_bucket: p.birthYearBucket, source_system: diff.sourceSystem, sourced_id: p.sourcedId }));
    const { error } = await svc.from("learner_profiles").upsert(rows, { onConflict: "learner_id" });
    if (error) throw new Error(`applyRosterImport: learner_profiles upsert (with bucket) failed: ${error.message}`);
  }
  if (withoutBucket.length > 0) {
    const rows = withoutBucket.map((p) => ({ learner_id: p.learnerId, role: "student" as const, source_system: diff.sourceSystem, sourced_id: p.sourcedId }));
    const { error } = await svc.from("learner_profiles").upsert(rows, { onConflict: "learner_id" });
    if (error) throw new Error(`applyRosterImport: learner_profiles upsert (no bucket) failed: ${error.message}`);
  }

  return {
    classesWritten: classUpserts.length,
    classMembersWritten: memberRows.length,
    reviewerCandidatesWritten: diff.reviewerCandidates.create.length + diff.reviewerCandidates.update.length,
    learnerProfilesWritten: profileUpserts.length,
  };
}

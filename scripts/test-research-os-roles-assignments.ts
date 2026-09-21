/**
 * Unit tests: roles as grants and assignments (ros-27, the Class step),
 * src/lib/research-os/roles.ts and assignments.ts. Pure. Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-research-os-roles-assignments.ts
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { canAssign, canOverride, overrideEvent, reviewsForClass, rolesIn, runsClass, validateOverride, visibleLearnerIds, type Membership } from "../src/lib/research-os/roles";
import { assignmentStatus, firstOpenTarget, targetIsLinkable, validateAssignment, type Assignment } from "../src/lib/research-os/assignments";

const learners = ["l1", "l2", "l3"];

test("teachers and librarians run a class; reviewers review; the rest do neither", () => {
  assert.equal(runsClass("teacher"), true);
  assert.equal(runsClass("librarian"), true);
  assert.equal(runsClass("parent"), false);
  assert.equal(reviewsForClass("reviewer"), true);
  assert.equal(reviewsForClass("peer"), false);
  assert.equal(canAssign(["learner", "librarian"]), true);
  assert.equal(canOverride(["parent"]), false);
});

test("visible learners by role", () => {
  const m = (role: Membership["role"], extra: Partial<Membership> = {}): Membership => ({ classId: "c", userId: "u", role, ...extra });
  assert.deepEqual(visibleLearnerIds(m("teacher"), learners), learners);
  assert.deepEqual(visibleLearnerIds(m("parent", { relatedLearnerId: "l2" }), learners), ["l2"]);
  assert.deepEqual(visibleLearnerIds(m("parent"), learners), []);
  assert.deepEqual(visibleLearnerIds(m("learner", { userId: "l3" }), learners), ["l3"]);
  assert.deepEqual(visibleLearnerIds(m("peer"), learners), learners);
});

test("rolesIn collects a person's roles in one class", () => {
  const ms: Membership[] = [
    { classId: "c", userId: "u", role: "teacher" },
    { classId: "c", userId: "u", role: "reviewer" },
    { classId: "d", userId: "u", role: "learner" },
  ];
  assert.deepEqual(rolesIn(ms, "c", "u"), ["teacher", "reviewer"]);
  assert.deepEqual(rolesIn(ms, "c", "x"), []);
});

test("overrides need a level, a reason, and a change", () => {
  assert.deepEqual(validateOverride({ fromStage: "access", toStage: "understanding", reason: "showed it in class" }), { ok: true });
  assert.equal((validateOverride({ fromStage: "access", toStage: "access", reason: "x y z" }) as { error: string }).error, "same_level");
  assert.equal((validateOverride({ fromStage: null, toStage: "awareness", reason: "" }) as { error: string }).error, "reason_required");
  const ev = overrideEvent({ fromStage: "access", toStage: "understanding", reason: " demoed ", setBy: "t1", classId: "c" }, new Date("2026-09-15T00:00:00Z"));
  assert.equal(ev.kind, "override");
  assert.equal(ev.reason, "demoed");
  assert.equal(ev.at, "2026-09-15T00:00:00.000Z");
});

test("assignment status follows level, productions, due date, and the production requirement", () => {
  const base: Assignment = { id: "a", classId: "c", targetNodeId: "n", title: "Sky paper", required: true, requiresProduction: true };
  const now = new Date("2026-09-15T00:00:00Z");
  assert.equal(assignmentStatus(base, { stage: null, productions: [] }, now), "not_started");
  assert.equal(assignmentStatus(base, { stage: "awareness", productions: [] }, now), "in_progress");
  assert.equal(assignmentStatus(base, { stage: "understanding", productions: [{ status: "draft" }] }, now), "produced");
  assert.equal(assignmentStatus(base, { stage: "production", productions: [{ status: "accepted" }] }, now), "accepted");
  assert.equal(assignmentStatus({ ...base, dueAt: "2026-09-01T00:00:00Z" }, { stage: "awareness", productions: [] }, now), "overdue");
  assert.equal(assignmentStatus({ ...base, requiresProduction: false }, { stage: "understanding", productions: [] }, now), "accepted");
});

test("validateAssignment trims and defaults", () => {
  const ok = validateAssignment({ title: "  Why is the sky blue  ", instructions: " write a page ", dueAt: "2026-10-01T00:00:00Z" });
  assert.ok(ok.ok);
  assert.equal(ok.value.title, "Why is the sky blue");
  assert.equal(ok.value.instructions, "write a page");
  assert.equal(ok.value.required, true);
  assert.equal(ok.value.requiresProduction, true);
  assert.equal((validateAssignment({ title: "ab" }) as { error: string }).error, "title_required");
  assert.equal((validateAssignment({ title: "fine", dueAt: "nope" }) as { error: string }).error, "bad_due_at");
});

/**
 * Which assignment a surface opens on, and which it may link to
 * (src/lib/research-os/assignments.ts). A learner who may not read a
 * target gets no slug for it, and the workspace used to redirect to
 * `?target=` on that empty value, read the empty value as no target, and
 * fire again on every load (Bucket critic C38, C49).
 */
test("a hidden target is never the one a surface opens on", () => {
  const rows = [
    { id: "a", status: "accepted", targetSlug: "done", targetHidden: false },
    { id: "b", status: "not_started", targetSlug: "", targetHidden: true },
    { id: "c", status: "in_progress", targetSlug: "open-me", targetHidden: false },
  ];
  const open = firstOpenTarget(rows);
  assert.equal(open?.id, "c", "the hidden one is skipped and the accepted one is done");
});

test("an empty slug is skipped even when nothing marked it hidden", () => {
  // A blanked slug can arrive from a failed read as well as a denial, so
  // the predicate checks the slug rather than trusting the flag alone.
  const rows = [{ id: "b", status: "not_started", targetSlug: "", targetHidden: false }];
  assert.equal(firstOpenTarget(rows), null, "nothing to open, so nothing is opened");
  assert.equal(targetIsLinkable(rows[0]), false, "and nothing links to it");
});

test("every assignment hidden or blank leaves the surface on its default", () => {
  assert.equal(firstOpenTarget([]), null);
  assert.equal(
    firstOpenTarget([
      { id: "a", status: "not_started", targetSlug: "", targetHidden: true },
      { id: "b", status: "overdue", targetSlug: "", targetHidden: true },
    ]),
    null,
    "a learner with only withheld targets is never redirected",
  );
});

test("a readable target is linkable and a withheld one is not", () => {
  assert.equal(targetIsLinkable({ targetSlug: "why-the-sky-is-blue", targetHidden: false }), true);
  assert.equal(targetIsLinkable({ targetSlug: "why-the-sky-is-blue", targetHidden: true }), false);
  assert.equal(targetIsLinkable({ targetSlug: "", targetHidden: false }), false);
  assert.equal(targetIsLinkable({}), false, "a row missing both fields links nowhere");
});

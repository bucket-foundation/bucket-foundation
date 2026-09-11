/**
 * Unit tests: OneRoster 1.2 CSV roster sync (bkt-ros, ros-06 follow-on),
 * src/lib/research-os/roster/{csv,grade,oneroster,diff,sources}.ts. No
 * database: matching every other scripts/test-research-os-*.ts file's
 * convention (node:test + node:assert), the CSV parser, the diff engine,
 * and the grade-to-bucket mapping run against plain fixture strings and
 * arrays. src/lib/research-os/roster/apply.ts (the live Supabase adapter)
 * is out of reach of this suite, same as every other DB-touching function
 * in this repo; see ROSTER.md, "what this suite does not cover."
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-research-os-roster.ts
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv } from "../src/lib/research-os/roster/csv";
import { gradeToBirthYearBucket, splitGradesField } from "../src/lib/research-os/roster/grade";
import { parseOneRosterBundle } from "../src/lib/research-os/roster/oneroster";
import { applyRosterDiffToState, computeRosterDiff, emptyRosterState, type RosterExistingState } from "../src/lib/research-os/roster/diff";
import { CleverSource, ClassLinkSource, OneRosterCsvSource } from "../src/lib/research-os/roster/sources";
import type { RosterBundle } from "../src/lib/research-os/roster/types";

// ---------------------------------------------------------------------------
// csv.ts
// ---------------------------------------------------------------------------

test("parseCsv: quoted fields, embedded commas, and doubled-quote escaping", () => {
  const text = 'sourcedId,title,note\nc1,"Grade 5, Science",plain\nc2,plain2,"He said ""hi"""\n';
  const rows = parseCsv(text);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].title, "Grade 5, Science");
  assert.equal(rows[1].note, "He said \"hi\"");
});

test("parseCsv: short row pads missing trailing columns with an empty string", () => {
  const rows = parseCsv("a,b,c\n1,2\n");
  assert.equal(rows[0].a, "1");
  assert.equal(rows[0].b, "2");
  assert.equal(rows[0].c, "");
});

// ---------------------------------------------------------------------------
// grade.ts
// ---------------------------------------------------------------------------

test("gradeToBirthYearBucket: grades 07 and below map to under13, 08-12 to 13to17", () => {
  assert.equal(gradeToBirthYearBucket(["KG"]), "under13");
  assert.equal(gradeToBirthYearBucket(["06"]), "under13");
  assert.equal(gradeToBirthYearBucket(["07"]), "under13");
  assert.equal(gradeToBirthYearBucket(["7"]), "under13");
  assert.equal(gradeToBirthYearBucket(["08"]), "13to17");
  assert.equal(gradeToBirthYearBucket(["12"]), "13to17");
});

test("gradeToBirthYearBucket: no recognized code returns null, never a guess", () => {
  assert.equal(gradeToBirthYearBucket([]), null);
  assert.equal(gradeToBirthYearBucket(["UG"]), null);
  assert.equal(gradeToBirthYearBucket(["PS"]), null);
});

test("gradeToBirthYearBucket: the youngest recognized code in a multi-grade list wins (bias young)", () => {
  assert.equal(gradeToBirthYearBucket(["10", "06"]), "under13");
});

test("splitGradesField: comma- or semicolon-joined codes", () => {
  assert.deepEqual(splitGradesField("06,07"), ["06", "07"]);
  assert.deepEqual(splitGradesField("06;07"), ["06", "07"]);
  assert.deepEqual(splitGradesField(""), []);
});

// ---------------------------------------------------------------------------
// Fixture bundle: 2 classes, 1 teacher, 5 students
// ---------------------------------------------------------------------------

const ORGS_CSV = ["sourcedId,name,type", "org-district-1,Example District,district", "org-school-1,Example School,school"].join("\n");

const CLASSES_CSV = ["sourcedId,title", "class-1,Grade 5 Science", "class-2,Grade 8 Science"].join("\n");

const ENROLLMENTS_CSV = [
  "sourcedId,classSourcedId,userSourcedId,role,primary",
  "enr-t1-c1,class-1,teacher-1,teacher,true",
  "enr-t1-c2,class-2,teacher-1,teacher,true",
  "enr-s1-c1,class-1,student-1,student,false",
  "enr-s2-c1,class-1,student-2,student,false",
  "enr-s3-c2,class-2,student-3,student,false",
  "enr-s4-c2,class-2,student-4,student,false",
  "enr-s5-c2,class-2,student-5,student,false",
  "enr-bad,class-unknown,student-1,student,false",
].join("\n");

function usersCsv(extraHeader = "", extraRow = ""): string {
  return [
    `sourcedId,enabledUser,username,givenName,familyName,email,grades${extraHeader}`,
    `teacher-1,true,tjones,Taylor,Jones,teacher1@school.example,${extraRow}`,
    `student-1,true,sstudent1,Sam,One,student1@school.example,05${extraRow}`,
    `student-2,true,sstudent2,Sam,Two,student2@school.example,06${extraRow}`,
    `student-3,true,sstudent3,Sam,Three,student3@school.example,08${extraRow}`,
    `student-4,true,sstudent4,Sam,Four,student4@school.example,09${extraRow}`,
    `student-5,true,sstudent5,Sam,Five,student5@school.example,${extraRow}`,
  ].join("\n");
}

function buildBundle(users = usersCsv()): RosterBundle {
  return parseOneRosterBundle({ orgsCsv: ORGS_CSV, usersCsv: users, classesCsv: CLASSES_CSV, enrollmentsCsv: ENROLLMENTS_CSV });
}

function stateWithAuthUsers(): RosterExistingState {
  const state = emptyRosterState();
  for (let i = 1; i <= 5; i++) state.authUserIdByEmail.set(`student${i}@school.example`, `learner-${i}`);
  return state;
}

test("parseOneRosterBundle: teacher resolved from enrollments.csv role, not users.csv (1.2 dropped that column)", () => {
  const bundle = buildBundle();
  const teacher = bundle.users.find((u) => u.sourcedId === "teacher-1");
  assert.ok(teacher);
  assert.equal(teacher!.role, "teacher");
  const student = bundle.users.find((u) => u.sourcedId === "student-1");
  assert.equal(student!.role, "student");
});

// ---------------------------------------------------------------------------
// Dry-run diff counts
// ---------------------------------------------------------------------------

test("computeRosterDiff: dry-run counts for the fixture bundle", () => {
  const bundle = buildBundle();
  const diff = computeRosterDiff(bundle, stateWithAuthUsers());
  assert.equal(diff.counts.orgsParsed, 2);
  assert.equal(diff.counts.usersParsed, 6);
  assert.equal(diff.counts.classesParsed, 2);
  assert.equal(diff.counts.enrollmentsParsed, 8);
  assert.equal(diff.counts.classesToCreate, 2);
  assert.equal(diff.counts.classesToUpdate, 0);
  assert.equal(diff.counts.classesUnresolved, 0);
  assert.equal(diff.counts.reviewerCandidatesToCreate, 1);
  assert.equal(diff.counts.learnerProfilesToCreate, 5);
  assert.equal(diff.counts.classMembersToCreate, 5);
  assert.equal(diff.counts.classMembersAlreadyPresent, 0);
  assert.equal(diff.counts.classMembersSkipped, 1);
});

test("computeRosterDiff: a class with no teacher enrollment at all is unresolved, not created", () => {
  const bundle: RosterBundle = {
    sourceSystem: "oneroster-csv",
    orgs: [],
    users: [{ sourcedId: "s1", role: "student", email: "s1@school.example", givenName: "S", familyName: "One", grades: ["05"] }],
    classes: [{ sourcedId: "class-lonely", title: "No Teacher" }],
    enrollments: [{ sourcedId: "e1", classSourcedId: "class-lonely", userSourcedId: "s1", role: "student", primary: false }],
  };
  const diff = computeRosterDiff(bundle, emptyRosterState());
  assert.equal(diff.counts.classesToCreate, 0);
  assert.equal(diff.counts.classesUnresolved, 1);
  assert.equal(diff.classes.unresolved[0].reason, "no_teacher_enrollment");
  assert.equal(diff.classMembers.skipped[0].reason, "unknown_class");
});

// ---------------------------------------------------------------------------
// Idempotency: apply twice yields no change
// ---------------------------------------------------------------------------

test("apply twice yields no change: second dry run against the post-apply state has zero creates/updates", () => {
  const bundle = buildBundle();
  const state0 = stateWithAuthUsers();

  const diff1 = computeRosterDiff(bundle, state0);
  const state1 = applyRosterDiffToState(state0, diff1);
  const diff2 = computeRosterDiff(bundle, state1);

  assert.equal(diff2.counts.classesToCreate, 0);
  assert.equal(diff2.counts.classesToUpdate, 0);
  assert.equal(diff2.counts.classMembersToCreate, 0);
  assert.equal(diff2.counts.classMembersAlreadyPresent, 5);
  assert.equal(diff2.counts.reviewerCandidatesToCreate, 0);
  assert.equal(diff2.counts.reviewerCandidatesToUpdate, 0);
  assert.equal(diff2.counts.learnerProfilesToCreate, 0);
  assert.equal(diff2.counts.learnerProfilesToUpdate, 0);
  // The malformed enrollment is reported every run; idempotency does not
  // make a structurally unresolved row disappear.
  assert.equal(diff2.counts.classMembersSkipped, 1);

  const state2 = applyRosterDiffToState(state1, diff2);
  const diff3 = computeRosterDiff(bundle, state2);
  assert.equal(diff3.counts.classMembersAlreadyPresent, 5);
});

test("applying a re-sync never resets an approved reviewer_candidates status", () => {
  const bundle = buildBundle();
  const state0 = stateWithAuthUsers();
  const diff1 = computeRosterDiff(bundle, state0);
  const state1 = applyRosterDiffToState(state0, diff1);
  state1.reviewerCandidates[0].status = "approved";

  const diff2 = computeRosterDiff(bundle, state1);
  assert.equal(diff2.counts.reviewerCandidatesToCreate, 0);
  assert.equal(diff2.counts.reviewerCandidatesToUpdate, 0);
  const state2 = applyRosterDiffToState(state1, diff2);
  assert.equal(state2.reviewerCandidates[0].status, "approved");
});

// ---------------------------------------------------------------------------
// Data minimization: extra PII columns dropped at parse time
// ---------------------------------------------------------------------------

test("extra PII columns (address, phone) are dropped at parse time, never persisted", () => {
  const bundle = buildBundle(usersCsv(",address,phone", ",123 Main St,555-0100"));
  assert.equal(bundle.users.length, 6);
  for (const u of bundle.users) {
    const keys = Object.keys(u);
    assert.ok(!keys.includes("address"), "parsed user must not carry an address field");
    assert.ok(!keys.includes("phone"), "parsed user must not carry a phone field");
  }
  const diff = computeRosterDiff(bundle, stateWithAuthUsers());
  const serializedProfiles = JSON.stringify(diff.learnerProfiles.create);
  const serializedCandidates = JSON.stringify(diff.reviewerCandidates.create);
  assert.ok(!serializedProfiles.includes("Main St") && !serializedProfiles.includes("555-0100"));
  assert.ok(!serializedCandidates.includes("Main St") && !serializedCandidates.includes("555-0100"));
});

// ---------------------------------------------------------------------------
// Malformed enrollment: unknown class reported and skipped
// ---------------------------------------------------------------------------

test("an enrollment referencing an unknown class is reported and skipped", () => {
  const bundle = buildBundle();
  const diff = computeRosterDiff(bundle, stateWithAuthUsers());
  const badEntry = diff.classMembers.skipped.find((s) => s.enrollmentSourcedId === "enr-bad");
  assert.ok(badEntry, "the malformed enrollment must be reported");
  assert.equal(badEntry!.reason, "unknown_class");
  assert.ok(
    !diff.classMembers.create.some((c) => c.classSourcedId === "class-unknown"),
    "no class_members row is ever created against an unresolved class",
  );
});

// ---------------------------------------------------------------------------
// Vendor adapters: RosterSource interface
// ---------------------------------------------------------------------------

test("OneRosterCsvSource.fetchBundle parses the same way parseOneRosterBundle does", async () => {
  const source = new OneRosterCsvSource({ orgsCsv: ORGS_CSV, usersCsv: usersCsv(), classesCsv: CLASSES_CSV, enrollmentsCsv: ENROLLMENTS_CSV });
  const bundle = await source.fetchBundle();
  assert.equal(bundle.sourceSystem, "oneroster-csv");
  assert.equal(bundle.classes.length, 2);
});

test("CleverSource and ClassLinkSource throw 'not configured' until a district partner is connected", async () => {
  await assert.rejects(() => new CleverSource().fetchBundle(), /not configured/);
  await assert.rejects(() => new ClassLinkSource().fetchBundle(), /not configured/);
});

// ---------------------------------------------------------------------------
// Migration text (static: no live Postgres in this suite, matching
// scripts/test-research-os-teacher-class.ts's own precedent).
// ---------------------------------------------------------------------------

const ROSTER_MIGRATION = join(__dirname, "..", "supabase", "migrations", "20260910050000_research_os_roster.sql");

test("migration: graph.classes and graph.learner_profiles gain source_system/sourced_id; graph.reviewer_candidates enables RLS", () => {
  const sql = readFileSync(ROSTER_MIGRATION, "utf8");
  assert.match(sql, /alter table graph\.classes add column if not exists source_system text/);
  assert.match(sql, /alter table graph\.classes add column if not exists sourced_id text/);
  assert.match(sql, /alter table graph\.learner_profiles add column if not exists source_system text/);
  assert.match(sql, /alter table graph\.learner_profiles add column if not exists sourced_id text/);
  assert.match(sql, /create table if not exists graph\.reviewer_candidates/);
  assert.match(sql, /alter table graph\.reviewer_candidates enable row level security/);
  assert.match(sql, /status\s+text\s+not null default 'pending'/);
});

// ---------------------------------------------------------------------------
// Privacy delete regression: the existing delete function still covers
// graph.learner_profiles now that this bead adds columns to it. No live
// Postgres to run graph.privacy_delete_learner against (same limit as
// every other migration-backed function in this suite), so this is a
// static read of its own SQL text, the same technique the RLS check
// above and TEACHER-LAYER.md's own migration test use.
// ---------------------------------------------------------------------------

const PRIVACY_MIGRATION = join(__dirname, "..", "supabase", "migrations", "20260910040000_research_os_privacy_consent.sql");

test("privacy delete regression: graph.privacy_delete_learner still deletes graph.learner_profiles rows", () => {
  const sql = readFileSync(PRIVACY_MIGRATION, "utf8");
  assert.match(sql, /delete from graph\.learner_profiles where learner_id = p_learner_id/);
});

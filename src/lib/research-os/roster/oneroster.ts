/**
 * Research OS for K-12, roster sync (bkt-ros, ros-06 follow-on). Parses
 * the four files this importer accepts out of a OneRoster 1.2 bulk CSV
 * bundle -- orgs.csv, users.csv, classes.csv, enrollments.csv -- per the
 * 1EdTech OneRoster 1.2 CSV Binding
 * (https://www.imsglobal.org/spec/oneroster/v1p2/bind/csv/). Every other
 * file a real bundle may carry (roles.csv, courses.csv,
 * academicSessions.csv, demographics.csv, manifest.csv, and the rest) is
 * ignored: PLAN-REVISION-2.md section 3 item 4 scopes this bead to a
 * standard-first skeleton, and these four are the only ones
 * graph.classes, graph.class_members, graph.reviewer_candidates, and
 * graph.learner_profiles need anything from. See ROSTER.md for the full
 * field-mapping table.
 *
 * ONE SPEC DETAIL THAT SHAPES THIS FILE: OneRoster 1.2 removed the `role`
 * and `orgSourcedIds` columns from users.csv (role allocation moved to
 * roles.csv, out of this importer's scope by the same "ignore the rest"
 * decision above). That leaves enrollments.csv's own `role` column
 * (administrator | proctor | student | teacher, restricted to those four
 * values) as the only place this importer can learn whether a given user
 * is a student or a teacher. A user with no student or teacher enrollment
 * anywhere in the bundle -- an administrator, a proctor, or a user row
 * enrollments.csv never references -- is discarded at parse time; neither
 * graph.reviewer_candidates nor graph.learner_profiles has a role for
 * them to occupy.
 *
 * Every field not named in ROSTER.md's mapping table is dropped here,
 * before it ever reaches a RosterUser/RosterClass/RosterEnrollment object:
 * username, password, phone, sms, identifier, userMasterIdentifier,
 * preferredGivenName/FamilyName, primaryOrgSourcedId, pronouns,
 * agentSourcedIds, and any non-standard column a real-world bundle adds
 * (an "address" column has no place in OneRoster 1.2 at all; if a bundle
 * carries one anyway, it is dropped the same way).
 */
import { parseCsv } from "./csv";
import { splitGradesField } from "./grade";
import type { RosterBundle, RosterClass, RosterEnrollment, RosterOrg, RosterUser, RosterUserRole } from "./types";

interface RawUser {
  sourcedId: string;
  email: string;
  givenName: string;
  familyName: string;
  grades: string[];
}

function nonEmpty(v: string | undefined): string {
  return (v ?? "").trim();
}

export function parseOrgsCsv(text: string): RosterOrg[] {
  return parseCsv(text)
    .filter((r) => nonEmpty(r.sourcedId))
    .map((r) => ({ sourcedId: nonEmpty(r.sourcedId), name: nonEmpty(r.name), type: nonEmpty(r.type) }));
}

function parseRawUsersCsv(text: string): RawUser[] {
  return parseCsv(text)
    .filter((r) => nonEmpty(r.sourcedId) && nonEmpty(r.email))
    .map((r) => ({
      sourcedId: nonEmpty(r.sourcedId),
      email: nonEmpty(r.email).toLowerCase(),
      givenName: nonEmpty(r.givenName),
      familyName: nonEmpty(r.familyName),
      grades: splitGradesField(nonEmpty(r.grades)),
    }));
}

export function parseClassesCsv(text: string): RosterClass[] {
  return parseCsv(text)
    .filter((r) => nonEmpty(r.sourcedId) && nonEmpty(r.title))
    .map((r) => ({ sourcedId: nonEmpty(r.sourcedId), title: nonEmpty(r.title) }));
}

interface RawEnrollment {
  sourcedId: string;
  classSourcedId: string;
  userSourcedId: string;
  role: string;
  primary: boolean;
}

const ENROLLMENT_ROLES = new Set(["student", "teacher"]);

function parseRawEnrollmentsCsv(text: string): RawEnrollment[] {
  return parseCsv(text)
    .filter((r) => nonEmpty(r.sourcedId) && nonEmpty(r.classSourcedId) && nonEmpty(r.userSourcedId))
    .map((r) => ({
      sourcedId: nonEmpty(r.sourcedId),
      classSourcedId: nonEmpty(r.classSourcedId),
      userSourcedId: nonEmpty(r.userSourcedId),
      role: nonEmpty(r.role).toLowerCase(),
      primary: nonEmpty(r.primary).toLowerCase() === "true",
    }));
}

export interface OneRosterCsvFiles {
  orgsCsv: string;
  usersCsv: string;
  classesCsv: string;
  enrollmentsCsv: string;
}

export const ONE_ROSTER_SOURCE_SYSTEM = "oneroster-csv";

/**
 * Parses the four accepted files into one RosterBundle. A user's role
 * (student vs teacher) is resolved from enrollments.csv, per this file's
 * header; a user administrator, proctor, or otherwise never enrolled as
 * either is dropped, along with every enrollment naming a role outside
 * {student, teacher} (an administrator or proctor enrollment row is
 * structurally valid OneRoster, just outside this table's scope, so it is
 * silently skipped rather than reported as an error). This function
 * throws only on a structurally missing bundle (an empty required file);
 * everything else that can go wrong at the row level becomes a
 * RosterDiff warning or error in diff.ts, decided at diff time.
 */
export function parseOneRosterBundle(files: OneRosterCsvFiles): RosterBundle {
  const orgs = parseOrgsCsv(files.orgsCsv);
  const rawUsers = parseRawUsersCsv(files.usersCsv);
  const classes = parseClassesCsv(files.classesCsv);
  const rawEnrollments = parseRawEnrollmentsCsv(files.enrollmentsCsv);

  if (rawUsers.length === 0) throw new Error("oneroster-csv: users.csv has no usable rows (sourcedId + email required)");
  if (classes.length === 0) throw new Error("oneroster-csv: classes.csv has no usable rows (sourcedId + title required)");

  const roleByUserSourcedId = new Map<string, RosterUserRole>();
  for (const e of rawEnrollments) {
    if (!ENROLLMENT_ROLES.has(e.role)) continue;
    // A teacher enrollment anywhere wins over a student one for this
    // user's own role classification: a person who both teaches one
    // section and is enrolled as a student in another (a teaching
    // assistant taking a course, say) is rare but real in SIS data, and
    // graph.reviewer_candidates is the safer of the two tables to place
    // them in -- a pending candidate a human still has to approve, versus
    // silently treating a teacher as a student record.
    const existing = roleByUserSourcedId.get(e.userSourcedId);
    if (existing === "teacher") continue;
    roleByUserSourcedId.set(e.userSourcedId, e.role as RosterUserRole);
  }

  const users: RosterUser[] = [];
  for (const u of rawUsers) {
    const role = roleByUserSourcedId.get(u.sourcedId);
    if (!role) continue; // no student/teacher enrollment anywhere: discarded, see header
    users.push({ sourcedId: u.sourcedId, role, email: u.email, givenName: u.givenName, familyName: u.familyName, grades: u.grades });
  }

  // An enrollment referencing a class outside classes.csv is kept as-is
  // here; diff.ts is where an unknown-class enrollment becomes a
  // reported, not-inserted error, per this bead's own test requirement.
  // Parsing never rejects a row for a dangling reference by itself.
  const enrollments: RosterEnrollment[] = rawEnrollments
    .filter((e) => ENROLLMENT_ROLES.has(e.role))
    .map((e) => ({ sourcedId: e.sourcedId, classSourcedId: e.classSourcedId, userSourcedId: e.userSourcedId, role: e.role as RosterUserRole, primary: e.primary }));

  return { sourceSystem: ONE_ROSTER_SOURCE_SYSTEM, orgs, users, classes, enrollments };
}

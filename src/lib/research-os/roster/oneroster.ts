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
    const existing = roleByUserSourcedId.get(e.userSourcedId);
    if (existing === "teacher") continue;
    roleByUserSourcedId.set(e.userSourcedId, e.role as RosterUserRole);
  }

  const users: RosterUser[] = [];
  for (const u of rawUsers) {
    const role = roleByUserSourcedId.get(u.sourcedId);
    if (!role) continue;
    users.push({ sourcedId: u.sourcedId, role, email: u.email, givenName: u.givenName, familyName: u.familyName, grades: u.grades });
  }

  const enrollments: RosterEnrollment[] = rawEnrollments
    .filter((e) => ENROLLMENT_ROLES.has(e.role))
    .map((e) => ({ sourcedId: e.sourcedId, classSourcedId: e.classSourcedId, userSourcedId: e.userSourcedId, role: e.role as RosterUserRole, primary: e.primary }));

  return { sourceSystem: ONE_ROSTER_SOURCE_SYSTEM, orgs, users, classes, enrollments };
}

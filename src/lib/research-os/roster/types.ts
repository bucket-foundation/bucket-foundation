/**
 * Research OS for K-12, roster sync (bkt-ros, ros-06 follow-on). Shared
 * types for a vendor-agnostic roster import: a parsed bundle in this
 * shape, whatever fetched it, feeds the same computeRosterDiff (diff.ts).
 * See ROSTER.md for the full field-mapping table and _intake/research-os-
 * k12/03-data-services.md section E for why OneRoster is the shared
 * shape Clever and ClassLink both normalize to once connected.
 */
import type { BirthYearBucket } from "../consent";

/** A parsed, minimized roster snapshot. Every field here is the product
 * of the data-minimization pass ROSTER.md documents: no address, phone,
 * password, username, or any other column a OneRoster bundle may carry
 * that this product does not need. */
export interface RosterOrg {
  sourcedId: string;
  name: string;
  type: string;
}

export type RosterUserRole = "student" | "teacher";

export interface RosterUser {
  sourcedId: string;
  role: RosterUserRole;
  email: string;
  givenName: string;
  familyName: string;
  /** Only present for a student row with a recognized OneRoster grade
   * code; see grade.ts. Never a birthdate. */
  grades: string[];
}

export interface RosterClass {
  sourcedId: string;
  title: string;
}

export interface RosterEnrollment {
  sourcedId: string;
  classSourcedId: string;
  userSourcedId: string;
  role: RosterUserRole;
  primary: boolean;
}

export interface RosterBundle {
  sourceSystem: string;
  orgs: RosterOrg[];
  users: RosterUser[];
  classes: RosterClass[];
  enrollments: RosterEnrollment[];
}

/**
 * A vendor-agnostic roster provider. fetchBundle returns the same
 * RosterBundle shape regardless of transport (an uploaded CSV bundle
 * today, a Clever or ClassLink API pull once one is wired), so
 * diff.ts's computeRosterDiff never needs to know which vendor produced
 * its input. See sources.ts.
 */
export interface RosterSource {
  readonly sourceSystem: string;
  fetchBundle(): Promise<RosterBundle>;
}

export interface LearnerProfileDraft {
  role: "student";
  birthYearBucket: BirthYearBucket | null;
  sourceSystem: string;
  sourcedId: string;
}

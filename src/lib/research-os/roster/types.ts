import type { BirthYearBucket } from "../consent";

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

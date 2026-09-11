/**
 * Research OS for K-12, roster sync (bkt-ros, ros-06 follow-on). Maps a
 * OneRoster CEDS grade code to graph.learner_profiles.birth_year_bucket
 * (supabase/migrations/20260910040000_research_os_privacy_consent.sql),
 * the only age signal the importer is allowed to derive: never a
 * birthdate, per compliance/DATA-INVENTORY.md's data-minimization note on
 * that column ("the coarsest fact requireConsent needs, and nothing more
 * precise").
 *
 * The mapping is deliberately biased toward the stricter bucket at the
 * boundary (grade 07, ages roughly 12-13, maps to 'under13' rather than
 * '13to17'): src/lib/research-os/consent.ts's decideConsent gates a minor
 * bucket the same way regardless of which minor bucket it is, so the only
 * real failure direction is classifying an actual under-13 learner as
 * something looser. Erring young costs an unnecessary but safe consent
 * step; erring old under-protects. No K-12 grade code maps to '18plus':
 * that bucket needs a signal this importer does not have (postsecondary
 * enrollment, self-reported age, or a birth date this importer refuses to
 * accept in the first place).
 */
import type { BirthYearBucket } from "../consent";

const UNDER_13_GRADES = new Set(["IT", "PR", "PK", "TK", "KG", "01", "02", "03", "04", "05", "06", "07"]);
const TEEN_GRADES = new Set(["08", "09", "10", "11", "12"]);

function normalizeGradeToken(raw: string): string {
  const t = raw.trim().toUpperCase();
  if (/^\d+$/.test(t)) return t.padStart(2, "0");
  return t;
}

/** OneRoster's `grades` field is a list of strings (comma-separated inside
 * one CSV field, per the 1.2 CSV binding's list-field convention); a
 * student can carry more than one grade code across terms. This takes the
 * most protective (youngest) recognized code in the list, the same
 * bias-young rule this file's header explains. Returns null when no
 * recognized code is present, so the caller leaves birth_year_bucket
 * untouched rather than guessing (see ROSTER.md, "what is discarded").
 */
export function gradeToBirthYearBucket(grades: string[]): BirthYearBucket | null {
  let sawUnder13 = false;
  let sawTeen = false;
  for (const raw of grades) {
    const g = normalizeGradeToken(raw);
    if (UNDER_13_GRADES.has(g)) sawUnder13 = true;
    else if (TEEN_GRADES.has(g)) sawTeen = true;
  }
  if (sawUnder13) return "under13";
  if (sawTeen) return "13to17";
  return null;
}

/** Splits a raw OneRoster CSV `grades` field into individual codes. The
 * field is one CSV cell already (csv.ts handles the RFC 4180 quoting), so
 * this only needs to split the comma- or semicolon-joined list inside it
 * -- OneRoster implementations vary on the separator in practice, and
 * accepting either costs nothing. */
export function splitGradesField(field: string): string[] {
  return field
    .split(/[,;]/)
    .map((g) => g.trim())
    .filter(Boolean);
}

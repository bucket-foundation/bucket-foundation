import type { BirthYearBucket } from "../consent";

const UNDER_13_GRADES = new Set(["IT", "PR", "PK", "TK", "KG", "01", "02", "03", "04", "05", "06", "07"]);
const TEEN_GRADES = new Set(["08", "09", "10", "11", "12"]);

function normalizeGradeToken(raw: string): string {
  const t = raw.trim().toUpperCase();
  if (/^\d+$/.test(t)) return t.padStart(2, "0");
  return t;
}

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

export function splitGradesField(field: string): string[] {
  return field
    .split(/[,;]/)
    .map((g) => g.trim())
    .filter(Boolean);
}

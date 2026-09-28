export const REGIONS = [
  "Europe",
  "Northern America",
  "Latin America and Caribbean",
  "Western Asia and Northern Africa",
  "Sub-Saharan Africa",
  "Central and Southern Asia",
  "Eastern and South-eastern Asia with Oceania",
] as const;

export type Region = (typeof REGIONS)[number];
export const UNPLACED = "unplaced";

export const SUBREGION_TO_REGION: Record<string, Region> = {
  "Northern Europe": "Europe",
  "Western Europe": "Europe",
  "Eastern Europe": "Europe",
  "Southern Europe": "Europe",
  "Northern America": "Northern America",
  Caribbean: "Latin America and Caribbean",
  "Central America": "Latin America and Caribbean",
  "South America": "Latin America and Caribbean",
  "Western Asia": "Western Asia and Northern Africa",
  "Northern Africa": "Western Asia and Northern Africa",
  "Eastern Africa": "Sub-Saharan Africa",
  "Middle Africa": "Sub-Saharan Africa",
  "Southern Africa": "Sub-Saharan Africa",
  "Western Africa": "Sub-Saharan Africa",
  "Central Asia": "Central and Southern Asia",
  "Southern Asia": "Central and Southern Asia",
  "Eastern Asia": "Eastern and South-eastern Asia with Oceania",
  "South-Eastern Asia": "Eastern and South-eastern Asia with Oceania",
  "Australia and New Zealand": "Eastern and South-eastern Asia with Oceania",
  Melanesia: "Eastern and South-eastern Asia with Oceania",
  Micronesia: "Eastern and South-eastern Asia with Oceania",
  Polynesia: "Eastern and South-eastern Asia with Oceania",
};

export const UNMAPPED_SUBREGIONS = ["Antarctica", "Seven seas (open ocean)"];

export function regionForSubregion(subregion: string): Region | null {
  if (subregion in SUBREGION_TO_REGION) return SUBREGION_TO_REGION[subregion];
  if (UNMAPPED_SUBREGIONS.includes(subregion)) return null;
  throw new Error(`no region for Natural Earth subregion ${subregion}`);
}

export const PERIODS = ["before -3000", "-3000 to -1001", "-1000 to -1", "0 to 999", "1000 to 1499", "1500 to 2100"] as const;
export type Period = (typeof PERIODS)[number];

export function periodOf(year: number): Period | null {
  if (!Number.isInteger(year)) return null;
  if (year < -3000) return "before -3000";
  if (year <= -1001) return "-3000 to -1001";
  if (year <= -1) return "-1000 to -1";
  if (year <= 999) return "0 to 999";
  if (year <= 1499) return "1000 to 1499";
  if (year <= 2100) return "1500 to 2100";
  return null;
}

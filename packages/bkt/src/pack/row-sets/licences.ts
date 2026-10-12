export type PublicScope = "rows" | "codes" | "none";
export type Row = Record<string, unknown>;

export const MATCH_ORDER = ["licence", "source_licence", "system", "slice", "host", "scheme", "table"] as const;
export type MatchKey = (typeof MATCH_ORDER)[number];

export interface LicenceEntry {
  id: string;
  match: Partial<Record<MatchKey, string[]>>;
  licence: string;
  share_alike: boolean;
  public: PublicScope;
  attribution: { source: string; url: string; notice: string };
}

export const UNKNOWN = "unknown";
export const FEDERAL = "US federal work, public domain";
export const RESTRICTED = "restricted";

export const LICENCE_RANK: Record<string, number> = {
  [FEDERAL]: 0,
  "CC0-1.0": 0,
  "CC-BY-4.0": 1,
  "OGL-UK-3.0": 1,
  "CC-BY-SA-4.0": 2,
  [RESTRICTED]: 3,
};

export const OPEN_K12_SYSTEMS = ["head-start-elof", "australia-v9", "england-nc"] as const;

export const REGISTRY: LicenceEntry[] = [
  {
    id: "cip2020",
    match: { scheme: ["cip2020"], table: ["cip_soc_crosswalk"] },
    licence: FEDERAL,
    share_alike: false,
    public: "rows",
    attribution: { source: "CIP 2020, National Center for Education Statistics", url: "https://nces.ed.gov/ipeds/cipcode/", notice: "Codes, titles and the CIP to SOC crosswalk are a work of the US government." },
  },
  {
    id: "soc2018",
    match: { scheme: ["soc2018", "soc"] },
    licence: FEDERAL,
    share_alike: false,
    public: "rows",
    attribution: { source: "SOC 2018 and OEWS, US Bureau of Labor Statistics", url: "https://www.bls.gov/soc/", notice: "Source: US Bureau of Labor Statistics, Standard Occupational Classification and Occupational Employment and Wage Statistics." },
  },
  {
    id: "onet",
    match: { scheme: ["onet31", "onet-soc"] },
    licence: "CC-BY-4.0",
    share_alike: false,
    public: "rows",
    attribution: {
      source: "O*NET 31.0 Database, USDOL/ETA",
      url: "https://www.onetcenter.org/database.html",
      notice: "This corpus includes information from the O*NET 31.0 Database by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA), used under the CC BY 4.0 licence. O*NET is a trademark of USDOL/ETA. Bucket Foundation has modified all or some of this information. USDOL/ETA has not approved, endorsed or tested these modifications.",
    },
  },
  {
    id: "census-occupations",
    match: { scheme: ["census-1950", "census-1960", "census-1970", "census-1980", "census-1990", "census-2002", "census-2010", "census-2018"] },
    licence: FEDERAL,
    share_alike: false,
    public: "rows",
    attribution: { source: "Census occupation classification, US Census Bureau", url: "https://www.census.gov/topics/employment/industry-occupation/guidance/code-lists.html", notice: "Occupation titles, codes and years of the US Census Bureau lists. The crosswalk files for 1950 to 1990 were read from IPUMS USA." },
  },
  {
    id: "atus",
    match: { scheme: ["ATUS lexicon 2003-2023"] },
    licence: FEDERAL,
    share_alike: false,
    public: "rows",
    attribution: { source: "American Time Use Survey activity lexicon, US Bureau of Labor Statistics", url: "https://www.bls.gov/tus/lexicons.htm", notice: "Source: US Bureau of Labor Statistics, American Time Use Survey." },
  },
  {
    id: "head-start-elof",
    match: { system: ["head-start-elof"] },
    licence: FEDERAL,
    share_alike: false,
    public: "rows",
    attribution: { source: "Head Start Early Learning Outcomes Framework, Office of Head Start", url: "https://headstart.gov/school-readiness/article/head-start-early-learning-outcomes-framework", notice: "A work of the US government, Office of Head Start." },
  },
  {
    id: "australia-v9",
    match: { system: ["australia-v9"] },
    licence: "CC-BY-4.0",
    share_alike: false,
    public: "rows",
    attribution: { source: "Australian Curriculum version 9, ACARA", url: "https://www.australiancurriculum.edu.au/copyright-and-terms-of-use", notice: "Copyright Australian Curriculum, Assessment and Reporting Authority (ACARA), used under CC BY 4.0. Bucket Foundation selected and reformatted this material." },
  },
  {
    id: "england-nc",
    match: { system: ["england-nc"] },
    licence: "OGL-UK-3.0",
    share_alike: false,
    public: "rows",
    attribution: { source: "National curriculum in England, Department for Education", url: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/", notice: "Contains public sector information licensed under the Open Government Licence v3.0." },
  },
  {
    id: "k12-restricted",
    match: { slice: ["k12-full"] },
    licence: RESTRICTED,
    share_alike: false,
    public: "none",
    attribution: { source: "K-12 standards systems with unknown or restricted terms", url: "", notice: "" },
  },
  {
    id: "hraf-ocm",
    match: { scheme: ["OCM"], host: ["hraf.yale.edu"] },
    licence: RESTRICTED,
    share_alike: false,
    public: "none",
    attribution: { source: "Outline of Cultural Materials, HRAF", url: "", notice: "" },
  },
  {
    id: "icatus",
    match: { scheme: ["ICATUS 2016"], host: ["unstats.un.org"] },
    licence: RESTRICTED,
    share_alike: false,
    public: "none",
    attribution: { source: "ICATUS 2016, UN Statistics Division", url: "", notice: "" },
  },
];

function hostOf(url: unknown): string | null {
  if (typeof url !== "string") return null;
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

export function matchValue(key: MatchKey, table: string, row: Row): string | null {
  const raw = key === "table" ? table : key === "host" ? hostOf(row.source_url) : row[key];
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  return value === "" || value.toLowerCase() === UNKNOWN ? null : value;
}

export function resolveEntry(table: string, row: Row, registry: LicenceEntry[] = REGISTRY): LicenceEntry | null {
  for (const key of MATCH_ORDER) {
    const value = matchValue(key, table, row);
    if (value === null) continue;
    const entry = registry.find((e) => e.match[key]?.includes(value));
    if (entry) return entry;
  }
  return null;
}

export function resolveSource(table: string, row: Row, registry: LicenceEntry[] = REGISTRY): string {
  return resolveEntry(table, row, registry)?.id ?? UNKNOWN;
}

export function publicSource(table: string, row: Row, registry: LicenceEntry[] = REGISTRY): string | null {
  const entry = resolveEntry(table, row, registry);
  return entry && entry.public !== "none" ? entry.id : null;
}

export function entryById(id: string, registry: LicenceEntry[] = REGISTRY): LicenceEntry | null {
  return registry.find((e) => e.id === id) ?? null;
}

export function licenceRank(entry: LicenceEntry): number {
  const rank = LICENCE_RANK[entry.licence];
  if (rank === undefined) throw new Error(`row sets: licence ${entry.licence} of source ${entry.id} has no rank`);
  return entry.share_alike ? Math.max(rank, 2) : rank;
}

export function strictest(entries: LicenceEntry[]): string {
  if (!entries.length) throw new Error("row sets: a set with no source has no licence");
  return entries.reduce((a, b) => (licenceRank(b) > licenceRank(a) ? b : a)).licence;
}

export function registryProblems(registry: LicenceEntry[] = REGISTRY): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  const claimed = new Map<string, string>();
  for (const e of registry) {
    if (e.id === UNKNOWN || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(e.id)) out.push(`${e.id}: bad id`);
    if (ids.has(e.id)) out.push(`${e.id}: listed twice`);
    ids.add(e.id);
    if (LICENCE_RANK[e.licence] === undefined) out.push(`${e.id}: licence ${e.licence} has no rank`);
    if (e.licence.trim().toLowerCase() === UNKNOWN) out.push(`${e.id}: the string unknown is no licence`);
    if (e.share_alike !== (LICENCE_RANK[e.licence] === 2)) out.push(`${e.id}: share_alike disagrees with ${e.licence}`);
    if ((e.public === "none") !== (e.licence === RESTRICTED)) out.push(`${e.id}: public ${e.public} disagrees with ${e.licence}`);
    if (e.public !== "none" && (!e.attribution.source || !e.attribution.url.startsWith("https://") || !e.attribution.notice)) out.push(`${e.id}: a public source needs a name, a link and a notice`);
    const keys = Object.keys(e.match) as MatchKey[];
    if (!keys.length) out.push(`${e.id}: matches nothing`);
    for (const key of keys) {
      if (!MATCH_ORDER.includes(key)) out.push(`${e.id}: unknown match key ${key}`);
      for (const value of e.match[key] ?? []) {
        const at = `${key}=${value}`;
        if (value.trim().toLowerCase() === UNKNOWN || value.trim() === "") out.push(`${e.id}: ${at} would match rows with no value`);
        if (claimed.has(at)) out.push(`${e.id}: ${at} is also claimed by ${claimed.get(at)}`);
        claimed.set(at, e.id);
      }
    }
  }
  return out;
}

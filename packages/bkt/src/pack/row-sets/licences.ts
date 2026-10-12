export type PublicScope = "rows" | "codes" | "none";
export type Row = Record<string, unknown>;

export const MATCH_ORDER = ["licence", "source_licence", "system", "slice", "host", "framework_id", "scheme", "table"] as const;
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
export const CCSS_LICENCE = "Common Core public licence";

export const LICENCE_RANK: Record<string, number> = {
  [FEDERAL]: 0,
  "CC0-1.0": 0,
  "CC-BY-4.0": 1,
  "OGL-UK-3.0": 1,
  [CCSS_LICENCE]: 1,
  "CC-BY-SA-4.0": 2,
  [RESTRICTED]: 3,
};

export const METADATA_TABLES: Record<string, string> = {
  attributions: "Credit lines keyed by source for the app. It holds no corpus row, so no row of it resolves to a source.",
  source_licences: "Licence facts per source. It holds no corpus row, so no row of it resolves to a source.",
};

export const RECALL_TABLES: readonly string[] = ["world_professions", "world_elements", "world_languages"];
export const RECALL_ID = "world-recall";

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
    id: "ipums",
    match: { host: ["usa.ipums.org"] },
    licence: RESTRICTED,
    share_alike: false,
    public: "none",
    attribution: { source: "IPUMS USA crosswalks and harmonised variables", url: "", notice: "" },
  },
  {
    id: "census-occupations",
    match: { scheme: ["census-1950", "census-1960", "census-1970", "census-1980", "census-1990", "census-2002", "census-2010", "census-2018"] },
    licence: FEDERAL,
    share_alike: false,
    public: "rows",
    attribution: { source: "Census occupation classification, US Census Bureau", url: "https://www.census.gov/topics/employment/industry-occupation/guidance/code-lists.html", notice: "Occupation titles and codes from the code lists the US Census Bureau publishes for 2002, 2010 and 2018." },
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
    id: "ccss-math",
    match: { framework_id: ["school-fw-ccss-math"] },
    licence: CCSS_LICENCE,
    share_alike: false,
    public: "rows",
    attribution: {
      source: "Common Core State Standards for Mathematics, with links from the Achieve the Core Coherence Map",
      url: "https://www.thecorestandards.org/public-license/",
      notice: "© Copyright 2010. National Governors Association Center for Best Practices and Council of Chief State School Officers. All rights reserved. Used under the public licence in support of the standards. The labels are Bucket's own wording and are no part of the standards. Links between standards come from the Coherence Map of Achieve the Core, whose authors dedicated it to the public domain under CC0 1.0.",
    },
  },
  {
    id: "wikidata",
    match: { host: ["www.wikidata.org"] },
    licence: "CC0-1.0",
    share_alike: false,
    public: "rows",
    attribution: { source: "Wikidata", url: "https://www.wikidata.org/wiki/Wikidata:Licensing", notice: "Names and dates come from Wikidata, whose structured data is released into the public domain under CC0 1.0. Each row here was picked by hand and links to its Wikidata item." },
  },
  {
    id: "wikipedia",
    match: { host: ["en.wikipedia.org"] },
    licence: "CC-BY-SA-4.0",
    share_alike: true,
    public: "rows",
    attribution: { source: "English Wikipedia and its contributors", url: "https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use", notice: "Names, dates and links come from pages of the English Wikipedia and their contributors, under CC BY-SA 4.0. Each row links to its page. Bucket selected and reformatted them, and these rows stay under CC BY-SA 4.0." },
  },
  {
    id: "arxiv",
    match: { host: ["arxiv.org"] },
    licence: "CC0-1.0",
    share_alike: false,
    public: "rows",
    attribution: { source: "arXiv record metadata", url: "https://info.arxiv.org/help/api/tou.html", notice: "The row links to an arXiv record. arXiv releases its record metadata under CC0 1.0, and the paper keeps its own licence." },
  },
  {
    id: RECALL_ID,
    match: { table: [...RECALL_TABLES] },
    licence: RESTRICTED,
    share_alike: false,
    public: "none",
    attribution: { source: "World rows written from recall, with no row checked against a source", url: "", notice: "" },
  },
  {
    id: "world-bank-wdi",
    match: { host: ["api.worldbank.org"] },
    licence: "CC-BY-4.0",
    share_alike: false,
    public: "rows",
    attribution: {
      source: "World Bank, World Development Indicators, education series",
      url: "https://creativecommons.org/licenses/by/4.0/",
      notice: "Source: World Bank, World Development Indicators, licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Bucket Foundation selected and reformatted the data. Data source: UNESCO Institute for Statistics",
    },
  },
  {
    id: "ons-soc-2020",
    match: { host: ["www.ons.gov.uk"] },
    licence: "OGL-UK-3.0",
    share_alike: false,
    public: "rows",
    attribution: {
      source: "Office for National Statistics, Standard Occupational Classification 2020 and its coding index",
      url: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
      notice: "Source: Office for National Statistics, Standard Occupational Classification 2020. Contains public sector information licensed under the Open Government Licence v3.0 (https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).",
    },
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
  const raw = key === "table" ? table : key === "host" ? hostOf(row.source_url) ?? hostOf(row.url) : row[key];
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  return value === "" || value.toLowerCase() === UNKNOWN ? null : value;
}

export function resolveEntry(table: string, row: Row, registry: LicenceEntry[] = REGISTRY): LicenceEntry | null {
  if (table in METADATA_TABLES) return null;
  if (RECALL_TABLES.includes(table)) return registry.find((e) => e.id === RECALL_ID) ?? null;
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

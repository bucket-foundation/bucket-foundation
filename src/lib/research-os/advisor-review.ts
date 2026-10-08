export const ADVISOR_REVIEW_SCHEMA = "bucket.advisor-review/1";
export const PRIME_DIRECTIONS_SCHEMA = "bucket.prime-directions/1";
export const MAX_REVIEW_ROWS = 20_000;

export type Scalar = string | number | boolean | null;

export interface AdvisorRow {
  rank: number;
  name: string;
  score: number;
  percentile: number | null;
  fields: Record<string, Scalar | Scalar[]>;
  links: Record<string, string>;
  star_prime: number[];
  star_ours: number[];
  complement: number | null;
  complement_directions: string[];
  theta: number | null;
  radius: number | null;
}

export interface AdvisorReview {
  schema: typeof ADVISOR_REVIEW_SCHEMA;
  key: string;
  prime_axes: string[];
  our_axes: string[];
  star_query_prime: number[];
  star_query_ours: number[];
  summary: string;
  rows: AdvisorRow[];
}

export interface PrimeComponent {
  index: number;
  angle_deg: number;
  variance_ratio: number;
  top_terms: string[];
  bottom_terms: string[];
}

export interface PrimeDirections {
  schema: typeof PRIME_DIRECTIONS_SCHEMA;
  corpus: string;
  generated_at: string;
  docs: number;
  terms: number;
  components: PrimeComponent[];
}

export class ReviewFileError extends Error {}

const LOCAL = String.raw`(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]{1,64}`;
const LABEL = String.raw`[A-Za-z0-9-]{1,63}`;
const AT = String.raw`\s*(?:@|\[\s*at\s*\]|\(\s*at\s*\)|\{\s*at\s*\}|<\s*at\s*>)\s*`;
const DOT = String.raw`\s*(?:\.|\[\s*dot\s*\]|\(\s*dot\s*\)|\{\s*dot\s*\}|<\s*dot\s*>)\s*`;
const SPOKEN = String.raw`${LOCAL}\s+at\s+${LABEL}(?:\s+dot\s+${LABEL})+`;
const EMAIL = new RegExp(String.raw`${LOCAL}${AT}${LABEL}(?:${DOT}${LABEL})+|${SPOKEN}`, "i");
const EMAILS = new RegExp(EMAIL.source, "gi");

export function scrubEmails(s: string): string {
  return s.normalize("NFKC").replace(EMAILS, "");
}

export function hasEmail(s: string): boolean {
  return EMAIL.test(s.normalize("NFKC"));
}
const PRIVATE_KEY = /email|tracker|image|^id$|statement|note/i;
const LINK_KEYS = new Set(["profile_url", "program_url"]);
const ROW_CORE = new Set(["rank", "name", "score", "percentile", "star_prime", "star_ours", "complement", "complement_directions", "theta", "radius"]);
const MAX_TEXT = 2_000;

const obj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const nums = (v: unknown): number[] => (Array.isArray(v) ? v.filter(num).slice(0, 64) : []);
const strs = (v: unknown, n = 64): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map(clean).slice(0, n) : []);

function clean(s: string): string {
  return scrubEmails(s.slice(0, MAX_TEXT));
}

function scalar(v: unknown): Scalar | undefined {
  if (v === null || typeof v === "boolean") return v;
  if (num(v)) return v;
  if (typeof v === "string") return clean(v);
  return undefined;
}

function https(v: unknown): string | null {
  if (typeof v !== "string" || hasEmail(v)) return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && !u.username && !u.password ? u.toString() : null;
  } catch {
    return null;
  }
}

export function publicRow(raw: unknown): AdvisorRow | null {
  if (!obj(raw) || !num(raw.rank) || typeof raw.name !== "string" || !num(raw.score)) return null;
  const fields: AdvisorRow["fields"] = {};
  const links: AdvisorRow["links"] = {};
  for (const [k, v] of Object.entries(raw)) {
    if (ROW_CORE.has(k) || PRIVATE_KEY.test(k)) continue;
    if (LINK_KEYS.has(k)) {
      const u = https(v);
      if (u) links[k] = u;
      continue;
    }
    const s = scalar(v);
    if (s !== undefined) fields[k] = s;
    else if (Array.isArray(v)) {
      const list = v.map(scalar).filter((x): x is Scalar => x !== undefined && typeof x !== "object").slice(0, 32);
      if (list.length) fields[k] = list;
    }
  }
  return {
    rank: raw.rank,
    name: clean(raw.name),
    score: raw.score,
    percentile: num(raw.percentile) ? raw.percentile : null,
    fields,
    links,
    star_prime: nums(raw.star_prime),
    star_ours: nums(raw.star_ours),
    complement: num(raw.complement) ? raw.complement : null,
    complement_directions: strs(raw.complement_directions, 3),
    theta: num(raw.theta) ? raw.theta : null,
    radius: num(raw.radius) ? raw.radius : null,
  };
}

export function parseAdvisorReview(raw: unknown): AdvisorReview {
  if (!obj(raw) || raw.schema !== ADVISOR_REVIEW_SCHEMA) throw new ReviewFileError(`expected a ${ADVISOR_REVIEW_SCHEMA} file, the review.json from advisor-review or fit-me`);
  if (!Array.isArray(raw.rows) || raw.rows.length === 0) throw new ReviewFileError("the review has no rows");
  if (raw.rows.length > MAX_REVIEW_ROWS) throw new ReviewFileError(`the review has more than ${MAX_REVIEW_ROWS} rows`);
  const ctx = obj(raw.context) ? raw.context : {};
  const rows = raw.rows.map(publicRow).filter((r): r is AdvisorRow => r !== null);
  if (!rows.length) throw new ReviewFileError("no row has a rank, a name and a score");
  return {
    schema: ADVISOR_REVIEW_SCHEMA,
    key: typeof ctx.key === "string" ? ctx.key.replace(/[^A-Za-z0-9]/g, "").slice(0, 32) : "",
    prime_axes: strs(ctx.prime_axes, 16),
    our_axes: strs(ctx.our_axes, 16),
    star_query_prime: nums(ctx.star_query_prime),
    star_query_ours: nums(ctx.star_query_ours),
    summary: typeof ctx.summary === "string" ? clean(ctx.summary) : "",
    rows: rows.sort((a, b) => a.rank - b.rank),
  };
}

export function parsePrimeDirections(raw: unknown): PrimeDirections {
  if (!obj(raw) || raw.schema !== PRIME_DIRECTIONS_SCHEMA) throw new ReviewFileError(`expected a ${PRIME_DIRECTIONS_SCHEMA} file, the prime.json from prime_directions run`);
  if (!Array.isArray(raw.components) || raw.components.length === 0) throw new ReviewFileError("the file has no components");
  const terms = (v: unknown) => (Array.isArray(v) ? v.map((t) => (obj(t) && typeof t.term === "string" ? clean(t.term) : null)).filter((t): t is string => !!t).slice(0, 20) : []);
  const list = raw.components.filter(obj).slice(0, 64);
  const components = list.map((c, i) => ({
    index: num(c.index) ? c.index : i + 1,
    angle_deg: num(c.angle_deg) ? c.angle_deg : (360 * i) / list.length,
    variance_ratio: num(c.variance_ratio) ? c.variance_ratio : 0,
    top_terms: terms(c.top_terms),
    bottom_terms: terms(c.bottom_terms),
  }));
  const shape = obj(raw.shape) ? raw.shape : {};
  return {
    schema: PRIME_DIRECTIONS_SCHEMA,
    corpus: typeof raw.corpus === "string" ? clean(raw.corpus).slice(0, 120) : "corpus",
    generated_at: typeof raw.generated_at === "string" ? raw.generated_at.slice(0, 40) : "",
    docs: num(shape.docs) ? shape.docs : 0,
    terms: num(shape.terms) ? shape.terms : 0,
    components,
  };
}

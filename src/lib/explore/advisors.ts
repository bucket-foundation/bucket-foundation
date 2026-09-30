import fs from "fs";
import os from "os";
import path from "path";
import {
  parseAdvisorReview,
  parsePrimeDirections,
  scrubEmails,
  hasEmail,
  type AdvisorReview,
  type AdvisorRow,
  type PrimeDirections,
} from "../research-os/advisor-review";
import type { AdvisorSource } from "./search";
import type { AdvisorOrigin } from "./advisor-origin";
import sampleReview from "./fixtures/advisors.sample.json";
import samplePrime from "./fixtures/prime.sample.json";

function readJson(p: string | undefined): unknown | null {
  if (!p) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function flat(v: unknown): string {
  if (Array.isArray(v)) return v.map(flat).join(" ");
  return v === null || v === undefined ? "" : String(v);
}

export function primeTerms(row: AdvisorRow, prime: PrimeDirections, n = 2): string[] {
  const order = row.star_prime
    .map((w, i) => ({ w, i }))
    .sort((a, b) => b.w - a.w)
    .slice(0, n);
  return order.flatMap(({ i }) => prime.components[i]?.top_terms ?? []);
}

export function advisorSources(review: AdvisorReview, prime: PrimeDirections): AdvisorSource[] {
  return review.rows.map((row) => {
    const field = typeof row.fields.field === "string" ? scrubEmails(row.fields.field) : "";
    const year = typeof row.fields.year === "number" ? row.fields.year : null;
    const text = scrubEmails(
      [
        ...Object.entries(row.fields)
          .filter(([k]) => k !== "field" && k !== "year")
          .map(([, v]) => flat(v)),
        ...primeTerms(row, prime),
      ]
        .filter(Boolean)
        .join(" "),
    );
    const url = row.links.profile_url ?? row.links.program_url ?? null;
    return {
      rank: row.rank,
      name: scrubEmails(row.name),
      field,
      text,
      year,
      score: row.score,
      star: row.star_prime,
      url: url && !hasEmail(url) && !/^mailto:/i.test(url) ? url : null,
    };
  });
}

export interface PrimeAxis {
  label: string;
  angle: number;
  terms: string[];
}

export function primeAxes(review: AdvisorReview, prime: PrimeDirections): PrimeAxis[] {
  return prime.components.map((c, i) => ({
    label: scrubEmails(review.prime_axes[i] || c.top_terms.slice(0, 2).join(" ") || `axis ${i + 1}`),
    angle: c.angle_deg,
    terms: c.top_terms,
  }));
}

export const ADVISOR_SPACE_SCHEMA = "bucket.advisor-space/1";
export const DEFAULT_BUNDLE_PATH = path.join(os.homedir(), ".local", "share", "bucket-advisor-review", "advisor-bundle.json");
export const MAX_BUNDLE_PROFILES = 20_000;
export const BUNDLE_COMPONENTS = 4;
export const SCORE_CAP = 3;

export class BundleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BundleError";
    Object.setPrototypeOf(this, BundleError.prototype);
  }
}

export interface BundleProfile {
  name: string;
  institution: string;
  field: string;
  topics: string[];
  url: string | null;
  scores: number[];
}

export interface AdvisorBundle {
  vocab: string[];
  components: number[][];
  profiles: BundleProfile[];
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const EXCLUDE_TRUE = ["opt_out", "optout", "opted_out", "private", "hidden", "excluded", "unpublished"];
const REQUIRE_TRUE = ["published", "publishable", "publish"];

export function isPublished(p: Record<string, unknown>): boolean {
  if (EXCLUDE_TRUE.some((k) => p[k] === true)) return false;
  return !REQUIRE_TRUE.some((k) => p[k] === false);
}

const clean = (v: unknown, n = 300): string => (typeof v === "string" ? scrubEmails(v.slice(0, n)) : "");

export function parseAdvisorBundle(raw: unknown): AdvisorBundle {
  if (!isObj(raw) || !isObj(raw.space) || raw.space.schema !== ADVISOR_SPACE_SCHEMA) throw new BundleError(`expected a ${ADVISOR_SPACE_SCHEMA} bundle`);
  const vocab = Array.isArray(raw.space.vocab) ? raw.space.vocab.filter((t): t is string => typeof t === "string") : [];
  const components = Array.isArray(raw.space.components) ? raw.space.components.filter((c): c is number[] => Array.isArray(c) && c.every(isNum)) : [];
  if (!vocab.length || !components.length || components.some((c) => c.length !== vocab.length)) throw new BundleError("the bundle space has no usable vocab or components");
  if (!Array.isArray(raw.profiles)) throw new BundleError("the bundle has no profiles");
  const profiles: BundleProfile[] = [];
  for (const p of raw.profiles.slice(0, MAX_BUNDLE_PROFILES)) {
    if (!isObj(p) || !isPublished(p) || typeof p.name !== "string" || !Array.isArray(p.scores) || !p.scores.every(isNum)) continue;
    const links = isObj(p.links) ? p.links : {};
    const url = typeof links.openalex === "string" && !hasEmail(links.openalex) && /^https?:\/\//i.test(links.openalex) ? links.openalex : null;
    profiles.push({
      name: clean(p.name, 120),
      institution: clean(p.institution),
      field: clean(p.field),
      topics: Array.isArray(p.topics) ? p.topics.map((t) => clean(t, 120)).filter(Boolean).slice(0, 12) : [],
      url,
      scores: p.scores.slice(0, components.length),
    });
  }
  if (!profiles.length) throw new BundleError("the bundle has no readable profiles");
  return { vocab, components, profiles };
}

export function bundleStar(scores: number[], n = BUNDLE_COMPONENTS): number[] {
  const out: number[] = [];
  for (let c = 0; c < n; c++) {
    const v = Math.max(-SCORE_CAP, Math.min(SCORE_CAP, scores[c] ?? 0)) / SCORE_CAP;
    out.push(Math.max(0, v), Math.max(0, -v));
  }
  return out;
}

export function bundleSources(bundle: AdvisorBundle): AdvisorSource[] {
  return bundle.profiles.map((p, i) => {
    const rms = Math.sqrt(p.scores.reduce((a, v) => a + v * v, 0) / Math.max(1, p.scores.length));
    return {
      rank: i + 1,
      name: p.name,
      field: p.field,
      text: [p.institution, ...p.topics].filter(Boolean).join(" "),
      year: null,
      score: Math.min(1, rms / SCORE_CAP),
      star: bundleStar(p.scores),
      url: p.url,
    };
  });
}

export function bundleAxes(bundle: AdvisorBundle, n = BUNDLE_COMPONENTS): PrimeAxis[] {
  const axes: PrimeAxis[] = [];
  const count = Math.min(n, bundle.components.length);
  const total = count * 2;
  for (let c = 0; c < count; c++) {
    const ranked = bundle.vocab.map((term, j) => ({ term, w: bundle.components[c][j] })).sort((a, b) => b.w - a.w || (a.term < b.term ? -1 : 1));
    const pos = ranked.slice(0, 4).map((r) => r.term);
    const neg = ranked.slice(-4).reverse().map((r) => r.term);
    axes.push({ label: pos.slice(0, 2).join(" "), angle: (360 * (2 * c)) / total, terms: pos });
    axes.push({ label: neg.slice(0, 2).join(" "), angle: (360 * (2 * c + 1)) / total, terms: neg });
  }
  return axes;
}

function bundlePath(): string | null {
  if (process.env.BUCKET_ADVISOR_REVIEW) return null;
  return process.env.BUCKET_ADVISOR_BUNDLE || DEFAULT_BUNDLE_PATH;
}

export function loadBundle(file: string | null): { sources: AdvisorSource[]; axes: PrimeAxis[] } | null {
  if (!file) return null;
  try {
    const bundle = parseAdvisorBundle(readJson(file));
    return { sources: bundleSources(bundle), axes: bundleAxes(bundle) };
  } catch {
    return null;
  }
}

export interface LoadedAdvisors {
  sources: AdvisorSource[];
  sample: boolean;
  origin: AdvisorOrigin;
  axes: PrimeAxis[];
}

let cache: LoadedAdvisors | null = null;

export function resetAdvisors(): void {
  cache = null;
}

export function loadAdvisors(): LoadedAdvisors {
  if (cache) return cache;
  const bundle = loadBundle(bundlePath());
  if (bundle) {
    cache = { ...bundle, sample: false, origin: "bundle" };
    return cache;
  }
  const rawReview = readJson(process.env.BUCKET_ADVISOR_REVIEW);
  const rawPrime = readJson(process.env.BUCKET_PRIME_DIRECTIONS);
  let review: AdvisorReview;
  let sample = false;
  try {
    review = parseAdvisorReview(rawReview);
  } catch {
    review = parseAdvisorReview(sampleReview);
    sample = true;
  }
  let prime: PrimeDirections;
  try {
    prime = parsePrimeDirections(rawPrime);
  } catch {
    prime = parsePrimeDirections(samplePrime);
  }
  cache = { sources: advisorSources(review, prime), sample, origin: sample ? "sample" : "review", axes: primeAxes(review, prime) };
  return cache;
}

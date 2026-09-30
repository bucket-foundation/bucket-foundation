import fs from "fs";
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
      url: url && !hasEmail(url) && !/^mailto:/i.test(url) ? url : null,
    };
  });
}

let cache: { sources: AdvisorSource[]; sample: boolean } | null = null;

export function loadAdvisors(): { sources: AdvisorSource[]; sample: boolean } {
  if (cache) return cache;
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
  cache = { sources: advisorSources(review, prime), sample };
  return cache;
}

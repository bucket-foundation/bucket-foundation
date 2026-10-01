import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { queryTerms, terms } from "../src/lib/explore/rank";
import type { Hit } from "../src/lib/explore/search";
import { SOURCE_TYPE, sourceHitId, type SourceIndex, type SourceKind } from "../src/lib/explore/sources";

const FIXTURE = path.join(__dirname, "fixtures", "explore-eval.draft.json");
const INDEX = path.join(__dirname, "..", "src", "data", "explore-sources.json");
const TOP_K = "60";
const UNVERIFIED = process.argv.includes("--unverified");
const NO_ADVISOR_TYPES = "excerpt,work,paper,text,talk,canon-file";
const ID_KINDS: [keyof Expected, SourceKind][] = [["openalex", "o"], ["gutenberg", "g"], ["wikisource", "w"]];

interface Expected {
  title: string;
  author: string;
  year: number;
  doi?: string;
  openalex?: string;
  gutenberg?: string;
  wikisource?: string;
  index_ids: string[];
}

interface EvalQuery {
  id: string;
  task: string;
  query: string;
  expected: Expected[];
  justified_by: string;
  citation_verified: boolean;
  in_index: boolean;
}

interface EvalSet {
  status: string;
  signer: string | null;
  notice: string;
  tasks: Record<string, string>;
  queries: EvalQuery[];
  negatives: { id: string; query: string }[];
}

interface Outcome {
  rank: number | null;
  pinned: boolean;
  rows: number;
  zeroMatch: number;
  sample: number;
}

interface Tally {
  n: number;
  top1: number;
  top3: number;
  gaps: number;
  misses: number;
  zeroMatch: number;
  sample: number;
}

interface Pinned {
  hit_id: string | null;
  title: string;
}

async function search(query: string): Promise<{ results: Hit[]; sample: boolean; pinned: Pinned | null }> {
  const { GET } = await import("../src/app/api/explore/search/route");
  const url = new URL("http://x/api/explore/search");
  url.searchParams.set("q", query);
  url.searchParams.set("top_k", TOP_K);
  if (UNVERIFIED) url.searchParams.set("types", NO_ADVISOR_TYPES);
  const res = await GET(new NextRequest(url.toString()));
  const body = JSON.parse(await res.text());
  if (res.status !== 200) throw new Error(`${query}: ${res.status} ${body?.error?.message ?? ""}`);
  return { results: body.results as Hit[], sample: body.advisors_sample === true, pinned: (body.pinned as Pinned | null) ?? null };
}

export function zeroMatch(query: string, hit: Hit): boolean {
  const shown = new Set(terms([hit.title, hit.subtitle, hit.text, ...(hit.fragments ?? []).map((f) => f.text)].join(" ")));
  return !queryTerms(query).some((t) => shown.has(t));
}

async function outcome(query: string, wanted: string[]): Promise<Outcome> {
  const { results, sample, pinned } = await search(query);
  const ids = (h: Hit) => [h.id, ...(h.also ?? [])];
  const card = pinned?.hit_id ?? null;
  const shown: string[][] = [...(pinned ? [card ? [card] : []] : []), ...results.filter((h) => !card || !ids(h).includes(card)).map(ids)];
  const at = shown.findIndex((entry) => entry.some((id) => wanted.includes(id)));
  return {
    rank: at < 0 ? null : at + 1,
    pinned: !!pinned,
    rows: results.length,
    zeroMatch: results.filter((h) => zeroMatch(query, h)).length,
    sample: results.filter((h) => h.type === "advisor" && (sample || /^sample advisor/i.test(h.title))).length,
  };
}

const wanted = (q: EvalQuery): string[] => q.expected.flatMap((e) => e.index_ids);

function fixtureProblems(set: EvalSet, held: Set<string>): string[] {
  const problems: string[] = [];
  for (const q of set.queries) {
    if (!set.tasks[q.task]) problems.push(`${q.id}: unknown task ${q.task}`);
    if (!q.justified_by) problems.push(`${q.id}: no outside source`);
    if (typeof q.citation_verified !== "boolean") problems.push(`${q.id}: citation_verified is not a boolean`);
    if (!Array.isArray(q.expected) || !q.expected.length) {
      problems.push(`${q.id}: no expected item`);
      continue;
    }
    if (q.in_index !== wanted(q).length > 0) problems.push(`${q.id}: in_index disagrees with index_ids`);
    for (const e of q.expected) {
      if (!e.doi && !ID_KINDS.some(([key]) => e[key])) problems.push(`${q.id}: ${e.title} has no DOI, OpenAlex, Gutenberg or Wikisource id`);
      for (const id of e.index_ids) if (!held.has(id)) problems.push(`${q.id}: ${id} is not in the index`);
      const ids: [SourceKind, string | undefined][] = [...ID_KINDS.map(([key, kind]): [SourceKind, string | undefined] => [kind, e[key] as string | undefined]), ["d", e.doi?.toLowerCase()]];
      for (const [kind, id] of ids) {
        if (typeof id === "string" && held.has(sourceHitId(kind, id)) && !e.index_ids.includes(sourceHitId(kind, id))) problems.push(`${q.id}: ${SOURCE_TYPE[kind]} ${id} is in the index and missing from index_ids`);
      }
    }
  }
  return problems;
}

const pad = (v: string | number, n: number) => String(v).padEnd(n);

async function main(): Promise<void> {
  process.env.VERCEL_ENV = UNVERIFIED ? "preview" : "production";
  if (UNVERIFIED) process.env.EXPLORE_FOUNDING_UNVERIFIED = "1";
  else delete process.env.EXPLORE_FOUNDING_UNVERIFIED;
  process.env.BUCKET_ADVISOR_REVIEW = path.join(__dirname, "fixtures", "no-advisor-review.json");
  delete process.env.BUCKET_ADVISOR_BUNDLE;
  delete process.env.BUCKET_PRIME_DIRECTIONS;

  const set = JSON.parse(fs.readFileSync(FIXTURE, "utf8")) as EvalSet;
  const index = JSON.parse(fs.readFileSync(INDEX, "utf8")) as SourceIndex;
  const held = new Set(index.items.map((row) => sourceHitId(row[0], row[1])));

  console.log(`Explore evaluation set: ${set.status}, signer ${set.signer ?? "none"}. ${set.notice}`);
  console.log(`${set.queries.length} queries, ${set.negatives.length} negatives, ${index.items.length} index rows, ${UNVERIFIED ? "preview with unverified founding works on and advisors left out" : "production gate set"}, top_k ${TOP_K}.`);
  console.log(`citations verified by a person: ${set.queries.filter((q) => q.citation_verified === true).length} of ${set.queries.length}.`);
  const problems = fixtureProblems(set, held);
  for (const p of problems) console.log(`FIXTURE PROBLEM  ${p}`);

  const tally: Record<string, Tally> = {};
  for (const task of Object.keys(set.tasks)) tally[task] = { n: 0, top1: 0, top3: 0, gaps: 0, misses: 0, zeroMatch: 0, sample: 0 };
  console.log(`\n${pad("id", 5)}${pad("held", 6)}${pad("rank", 6)}${pad("card", 6)}${pad("rows", 6)}${pad("zero", 6)}query`);
  for (const q of set.queries) {
    const o = await outcome(q.query, wanted(q));
    const t = (tally[q.task] ??= { n: 0, top1: 0, top3: 0, gaps: 0, misses: 0, zeroMatch: 0, sample: 0 });
    t.n++;
    if (o.rank === 1) t.top1++;
    if (o.rank !== null && o.rank <= 3) t.top3++;
    if (!q.in_index) t.gaps++;
    else if (o.rank === null || o.rank > 3) t.misses++;
    t.zeroMatch += o.zeroMatch;
    t.sample += o.sample;
    console.log(`${pad(q.id, 5)}${pad(q.in_index ? "yes" : "gap", 6)}${pad(o.rank ?? "-", 6)}${pad(o.pinned ? "yes" : "-", 6)}${pad(o.rows, 6)}${pad(o.zeroMatch, 6)}${q.query}`);
  }

  console.log(`\n${pad("task", 16)}${pad("n", 4)}${pad("attainable", 12)}${pad("top 1", 7)}${pad("top 3", 7)}${pad("data gaps", 11)}${pad("ranking misses", 16)}${pad("zero-match rows", 17)}sample rows`);
  const all = Object.values(tally);
  const sum = (pick: (t: Tally) => number) => all.reduce((a, t) => a + pick(t), 0);
  for (const [task, t] of Object.entries(tally)) {
    console.log(`${pad(task, 16)}${pad(t.n, 4)}${pad(t.n - t.gaps, 12)}${pad(t.top1, 7)}${pad(t.top3, 7)}${pad(t.gaps, 11)}${pad(t.misses, 16)}${pad(t.zeroMatch, 17)}${t.sample}`);
  }
  const attainable = sum((t) => t.n - t.gaps);
  console.log(`\nresult: top 1 on ${sum((t) => t.top1)} of ${attainable} attainable, top 3 on ${sum((t) => t.top3)} of ${attainable} attainable, ${sum((t) => t.gaps)} data gaps, ${sum((t) => t.misses)} ranking misses, ${sum((t) => t.n)} queries.`);

  let answered = 0;
  let rows = 0;
  let sample = 0;
  for (const n of set.negatives) {
    const o = await outcome(n.query, []);
    if (o.rows > 0) answered++;
    rows += o.rows;
    sample += o.sample;
    console.log(`${pad(n.id, 5)}${pad("neg", 6)}${pad("-", 6)}${pad(o.pinned ? "yes" : "-", 6)}${pad(o.rows, 6)}${pad(o.zeroMatch, 6)}${n.query}`);
  }
  console.log(`\nnegatives: ${answered} of ${set.negatives.length} returned rows, ${rows} rows in all, ${sample} sample rows.`);
  console.log("A ranking miss is a held item outside the top 3. Rank counts the pinned card as the first entry, and an entry counts when any record of the same work is expected. A zero-match row shares no query word with its returned title, subtitle or text.");
  console.log(`Report only: this run gates nothing${problems.length ? `, and the fixture has ${problems.length} problem${problems.length === 1 ? "" : "s"} listed above` : ""}.`);
}

main().catch((e) => console.log(`EVAL DID NOT RUN  ${e instanceof Error ? e.stack ?? e.message : String(e)}`));

import { exploreSearch, EXPLORE_DEFAULT_TOP_K, type ExploreSearchDeps } from "../src/lib/explore/respond";
import * as loader from "../src/lib/explore/sources";
import * as pure from "../src/lib/explore/source-index";
import * as reference from "../src/lib/explore/reference";
import * as referenceCore from "../src/lib/explore/reference-core";
import type { CanonSearchParams } from "../src/lib/canon-rank";

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!cond) failed++;
}

interface Body {
  query: string | null;
  top_k: number;
  mode: string;
  n_results: number;
  advisors_sample: boolean;
  advisors_source: string;
  results: { id: string; type: string; year: number | null }[];
  took_ms: number;
}

const entry = { rowid: 0, branch: "02-physics", concept: "quantum", slug: "a", title: "Photon quantum", path: "", text: "photon quantum light", vec: new Float32Array(0) };
const pool = pure.prepare({ v: 1, items: [["p", "100", "Photon quantum fluctuations", 1992, "Physical review", "Sachdev"]] });
const advisor = { rank: 1, name: "A Person", field: "physics", text: "photon quantum", year: 1990, score: 0.9, url: null, star: [0.5, 0.1] };

const calls = { sources: 0, canonFiles: 0 };
let seen: CanonSearchParams | null = null;
function deps(over: Partial<ExploreSearchDeps> = {}): ExploreSearchDeps {
  return {
    canon: (p) => {
      seen = p;
      return p.q ? { ok: true, mode: "lexical", results: [{ entry, score: 2 }] } : { ok: false, status: 400, code: "missing_q", message: "q or qvec required" };
    },
    advisors: () => ({ sources: [advisor], sample: true, origin: "sample", axes: [{ label: "x", angle: 0, terms: ["x"] }] }),
    sources: () => {
      calls.sources++;
      return pool;
    },
    yearOf: (concept) => (concept === "quantum" ? 1900 : null),
    canonFiles: () => {
      calls.canonFiles++;
      return [];
    },
    ...over,
  };
}

const at = (query: string) => new URL(`http://site.test/api/explore/search${query}`);

async function main() {
  const ok = await exploreSearch(deps(), at("?q=photon%20quantum"));
  const body = ok.body as Body;
  check("a query answers 200 with the eight response fields", ok.status === 200 && Object.keys(body).join(",") === "query,top_k,mode,n_results,advisors_sample,advisors_source,results,took_ms");
  check("the default top_k is 40", EXPLORE_DEFAULT_TOP_K === 40 && body.top_k === 40 && seen!.topK === 40);
  check("results hold an excerpt, a work, an advisor and a paper", ["excerpt", "work", "advisor", "paper"].every((t) => body.results.some((h) => h.type === t)), body.results.map((h) => h.type).join(","));
  check("the excerpt carries the timeline year", body.results.find((h) => h.type === "excerpt")?.year === 1900);
  check("the advisor origin is reported", body.advisors_sample === true && body.advisors_source === "sample" && body.n_results === body.results.length);

  const before = { ...calls };
  const branch = (await exploreSearch(deps(), at("?q=photon&branch=02-physics"))).body as Body;
  check("a branch filter skips sources, advisors and canon files", calls.sources === before.sources && calls.canonFiles === before.canonFiles && branch.results.every((h) => h.type === "excerpt" || h.type === "work"));
  const typed = (await exploreSearch(deps(), at("?q=photon&types=excerpt,nonsense"))).body as Body;
  check("a types filter keeps the named types and ignores unknown names", calls.sources === before.sources && typed.results.every((h) => h.type === "excerpt"));

  const missing = await exploreSearch(deps(), at(""));
  check("a missing query returns the canon error in an error object", missing.status === 400 && JSON.stringify(missing.body) === JSON.stringify({ error: { code: "missing_q", message: "q or qvec required" } }));

  const map = await exploreSearch(deps(), at("?map=1"));
  check("map=1 returns advisors with a star and never calls canon search twice", JSON.stringify(map.body) === JSON.stringify({ advisors_sample: true, advisors_source: "sample", axes_split: false, axes: [{ label: "x", angle: 0, terms: ["x"] }], advisors: [{ id: "advisor:1", name: "A Person", field: "physics", score: 0.9, star: [0.5, 0.1] }] }));
  const none = await exploreSearch(deps({ advisors: () => ({ sources: [], sample: false, origin: "none", axes: [] }) }), at("?q=photon"));
  check("no advisors yields no advisor hit", (none.body as Body).advisors_source === "none" && !(none.body as Body).results.some((h) => h.type === "advisor"));

  const pureNames = Object.keys(pure).sort();
  check("the loader module re-exports every pure name unchanged", pureNames.every((k) => (loader as Record<string, unknown>)[k] === (pure as Record<string, unknown>)[k]));
  check("the loader module adds only the two fs functions", Object.keys(loader).filter((k) => !pureNames.includes(k)).sort().join(",") === "loadSourceIndex,resetSourceIndex");
  const coreNames = Object.keys(referenceCore).sort();
  check("the reference module re-exports the pure part and adds the loader", coreNames.every((k) => (reference as Record<string, unknown>)[k] === (referenceCore as Record<string, unknown>)[k]) && Object.keys(reference).filter((k) => !coreNames.includes(k)).join(",") === "loadReferenceBasis");

  if (failed) {
    console.error(`${failed} failed`);
    process.exit(1);
  }
  console.log("all passed");
}

main();

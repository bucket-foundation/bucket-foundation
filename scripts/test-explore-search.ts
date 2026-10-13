import { unify, tokens, coverage, advisorId, excerptId } from "../src/lib/explore/search";
import { advisorSources, primeTerms } from "../src/lib/explore/advisors";
import { canonSearch, parseCanonSearchParams, CANON_TOP_K_MAX } from "../src/lib/canon-search";
import { parseAdvisorReview, parsePrimeDirections } from "../src/lib/research-os/advisor-review";
import sampleReview from "../src/lib/explore/fixtures/advisors.sample.json";
import samplePrime from "../src/lib/explore/fixtures/prime.sample.json";

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!cond) failed++;
}

const review = parseAdvisorReview(sampleReview);
const prime = parsePrimeDirections(samplePrime);
const advisors = advisorSources(review, prime);

check("sample advisors load", advisors.length === 6);
check("prime terms follow the strongest star_prime axes", primeTerms(review.rows[0], prime).includes("mitochondria"));
check("advisor text carries prime terms", advisors[0].text.includes("light"));

const excerpts = [
  { branch: "05-biophysics", concept: "light", slug: "a", title: "Light and water", text: "Mitochondria turn light into water.", score: 4 },
  { branch: "02-physics", concept: "quantum", slug: "b", title: "Quantum photon", text: "A photon carries a quantum of energy.", score: 2 },
  { branch: "02-physics", concept: "quantum", slug: "c", title: "Electron field", text: "The electron field and the photon.", score: 1 },
];

const hits = unify({ query: "photon quantum", excerpts, advisors });
check("results are non-empty", hits.length > 0);
check("scores sorted descending", hits.every((h, i) => i === 0 || hits[i - 1].score >= h.score));
check("every score is above zero", hits.every((h) => h.score > 0));
const types = new Set(hits.map((h) => h.type));
check("hits include every type", types.has("excerpt") && types.has("advisor") && types.has("work"));
check("advisor B ranks first among advisors", hits.find((h) => h.type === "advisor")?.id === advisorId({ rank: 2 }));

const b = hits.find((h) => h.id === advisorId({ rank: 2 }))!;
check("advisor links to nearest excerpts", b.links.includes(excerptId(excerpts[1])));
const ex = hits.find((h) => h.id === excerptId(excerpts[1]))!;
check("excerpt links back to advisor", ex.links.some((l) => l.startsWith("advisor:")));
const work = hits.find((h) => h.type === "work" && h.title === "quantum")!;
check("work groups excerpts of one concept", work.links.length === 2);

const onlyAdvisors = unify({ query: "photon quantum", excerpts, advisors, types: ["advisor"] });
check("type filter keeps only advisors", onlyAdvisors.length > 0 && onlyAdvisors.every((h) => h.type === "advisor"));
check("topK caps results", unify({ query: "photon quantum", excerpts, advisors, topK: 2 }).length === 2);
check("empty query tokens give no advisor hits", unify({ query: "a", excerpts: [], advisors }).length === 0);
check("coverage counts query tokens", coverage(tokens("photon quantum"), tokens("photon")) === 0.5);

const EMAIL_RE = /[A-Za-z0-9._%+-]+\s*(@|\[\s*at\s*\])\s*[A-Za-z0-9-]+\s*(\.|\[\s*dot\s*\])\s*[A-Za-z]{2,}/i;
const leakyRaw = JSON.parse(JSON.stringify(sampleReview));
leakyRaw.rows[1].name = "Sample Advisor B jane.doe@example.org";
leakyRaw.rows[1].contact_email = "jane.doe@example.org";
leakyRaw.rows[1].topics = [...leakyRaw.rows[1].topics, "write jane [at] example [dot] org"];
leakyRaw.rows[1].profile_url = "mailto:jane.doe@example.org";
const parsedLeaky = advisorSources(parseAdvisorReview(leakyRaw), prime);
const directLeaky = advisorSources(
  {
    ...review,
    rows: review.rows.map((r, i) =>
      i === 1
        ? {
            ...r,
            name: "B jane.doe@example.org",
            fields: { ...r.fields, field: "physics jane@example.org", bio: "reach me at jane.doe@example.org" },
            links: { profile_url: "mailto:jane.doe@example.org" },
          }
        : r,
    ),
  },
  prime,
);
for (const [label, srcs] of [["parsed", parsedLeaky], ["unparsed", directLeaky]] as const) {
  const out = JSON.stringify(unify({ query: "photon quantum physics", excerpts, advisors: srcs, topK: 50 }));
  check(`no email reaches search output from ${label} advisors`, !EMAIL_RE.test(out) && !out.includes("mailto"), out.match(EMAIL_RE)?.[0] ?? "");
  check(`email-bearing ${label} advisor still ranks`, out.includes(advisorId({ rank: 2 })));
}

const ranked = unify({ query: "photon quantum", excerpts, advisors, types: ["excerpt", "advisor"] });
const topExcerpt = ranked.filter((h) => h.type === "excerpt")[0];
const topAdvisor = ranked.filter((h) => h.type === "advisor")[0];
check("pools keep absolute scores", topExcerpt.score === 4 && topAdvisor.score > 0 && topAdvisor.score !== 1);
check("an excerpt scored zero is dropped for a worded query", !unify({ query: "photon", excerpts: [{ ...excerpts[0], score: 0 }], advisors: [] }).length);
check("excerpt order follows canon rank", topExcerpt.id === excerptId(excerpts[0]));
check("empty query keeps canon excerpts from qvec search", unify({ query: "", excerpts, advisors }).some((h) => h.type === "excerpt"));

const p = parseCanonSearchParams(new URL("http://x/api/explore/search?q=photon&top_k=500&branch=02-physics&tier=Core&mode=SEMANTIC"), 40);
check("explore shares canon top_k cap of 50", p.topK === CANON_TOP_K_MAX && CANON_TOP_K_MAX === 50);
check("branch, tier and mode parse like canon search", p.branch === "02-physics" && p.tier === "core" && p.mode === "semantic");
check("bad top_k falls back to default", parseCanonSearchParams(new URL("http://x/?q=a&top_k=zz"), 40).topK === 40);
check("missing q and qvec is a 400", (() => {
  const r = canonSearch(parseCanonSearchParams(new URL("http://x/")));
  return !r.ok && r.status === 400;
})());

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log("all passed");

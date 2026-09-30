import { unify, tokens, coverage, advisorId, excerptId } from "../src/lib/explore/search";
import { advisorSources, primeTerms } from "../src/lib/explore/advisors";
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
check("scores are in [0,1]", hits.every((h) => h.score >= 0 && h.score <= 1));
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

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log("all passed");

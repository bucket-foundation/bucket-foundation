import fs from "fs";
import os from "os";
import path from "path";
import { SPLIT_NOTE } from "../src/lib/explore/modes/map";
import { advisorSources, BundleError, isPublished, DEFAULT_BUNDLE_PATH, bundleAxes, bundleSources, bundleStar, loadAdvisors, loadBundle, parseAdvisorBundle, resetAdvisors } from "../src/lib/explore/advisors";
import { ORIGIN_LABEL } from "../src/lib/explore/advisor-origin";
import { hasEmail, parseAdvisorReview, parsePrimeDirections, publicRow } from "../src/lib/research-os/advisor-review";
import { advisorsOrder, exploreSearch } from "../src/lib/explore/respond";
import { mapLayout } from "../src/lib/explore/modes/map";
import { UNTESTED_ORDERING, advisorId, unify } from "../src/lib/explore/search";
import fixture from "../src/lib/explore/fixtures/advisor-bundle.sample.json";
import sampleReview from "../src/lib/explore/fixtures/advisors.sample.json";
import samplePrime from "../src/lib/explore/fixtures/prime.sample.json";
import { samplesAllowed } from "../src/lib/explore/sample-gate";
import { SAMPLE_DATASET, dataParam, listDatasets } from "../src/lib/explore/datasets";

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!cond) failed++;
}

const bundle = parseAdvisorBundle(fixture);
check("fixture bundle parses", bundle.profiles.length === 3 && bundle.vocab.length === 6 && bundle.components.length === 4);
check("wrong schema is rejected", (() => {
  try {
    parseAdvisorBundle({ space: { schema: "other/1" }, profiles: [] });
    return false;
  } catch (e) {
    return e instanceof BundleError;
  }
})());
check("ragged components are rejected", (() => {
  try {
    parseAdvisorBundle({ ...fixture, space: { ...fixture.space, components: [[1, 2]] } });
    return false;
  } catch (e) {
    return e instanceof BundleError;
  }
})());
check("non-object input is rejected", (() => {
  try {
    parseAdvisorBundle(null);
    return false;
  } catch {
    return true;
  }
})());

const flagged = (extra: Record<string, unknown>) => ({ ...fixture, profiles: [{ ...fixture.profiles[0], ...extra }, fixture.profiles[2]] });
for (const [label, extra] of [["published false", { published: false }], ["publishable false", { publishable: false }], ["opt_out true", { opt_out: true }], ["private true", { private: true }], ["hidden true", { hidden: true }]] as const) {
  check(`profile with ${label} is skipped`, parseAdvisorBundle(flagged(extra)).profiles.length === 1);
}
check("profile with published true is kept", parseAdvisorBundle(flagged({ published: true, opt_out: false })).profiles.length === 2);
check("isPublished ignores profiles with no flags", isPublished({ name: "x" }));
check("a bundle where every profile is flagged is rejected", (() => {
  try {
    parseAdvisorBundle({ ...fixture, profiles: [{ ...fixture.profiles[0], opt_out: true }] });
    return false;
  } catch (e) {
    return e instanceof BundleError;
  }
})());
const split = mapLayout({ axes: bundleAxes(bundle), advisors: [], split: true }, [], undefined);
check("split bundle axes are stated in the legend", split.legend.some((l) => l.label === SPLIT_NOTE) && SPLIT_NOTE.includes("4 bundle components split by sign") && SPLIT_NOTE.includes("top terms"));
check("unsplit axes add no split note", !mapLayout({ axes: bundleAxes(bundle), advisors: [] }, [], undefined).legend.some((l) => l.label === SPLIT_NOTE));

const out = JSON.stringify(bundle);
check("emails are scrubbed from names, fields, topics and links", !hasEmail(out) && !out.includes("mailto"));
check("mailto link is dropped", bundle.profiles[1].url === null && bundle.profiles[0].url === "https://openalex.org/A1");

check("star splits signed scores into positive and negative axes", (() => {
  const s = bundleStar([3, -1.5, 0, 6]);
  return s.length === 8 && s[0] === 1 && s[1] === 0 && s[2] === 0 && s[3] === 0.5 && s[6] === 1 && s[7] === 0;
})());

const sources = bundleSources(bundle);
check("sources carry rank, star, score and topics in text", sources.length === 3 && sources[0].rank === 1 && sources[0].star?.length === 8 && sources[0].text.includes("Mitochondria") && sources.every((s) => s.score >= 0 && s.score <= 1));
const axes = bundleAxes(bundle);
check("axes come in opposite pairs with terms", axes.length === 8 && axes[0].terms[0] === "light" && axes[1].angle - axes[0].angle === 45 && axes[1].terms.length > 0);

const hits = unify({ query: "quantum fields", excerpts: [], advisors: sources });
check("bundle advisors are searchable", hits[0]?.type === "advisor" && hits[0].title.startsWith("Fixture Advisor Two"));
check("email-bearing advisor output has no email", !hasEmail(JSON.stringify(hits)));

const layout = mapLayout({ axes, advisors: sources.map((s) => ({ id: `advisor:${s.rank}`, name: s.name, field: s.field, score: s.score, star: s.star ?? [] })) }, [], undefined);
check("map lays out bundle advisors on eight axes", layout.nodes.length === 3 && layout.guides.filter((g) => g.kind === "text").length === 8);
check("advisor one sits on the light side", layout.nodes[0].position[0] > 0.5);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "advisor-bundle-"));
const file = path.join(tmp, "bundle.json");
fs.writeFileSync(file, JSON.stringify(fixture));
check("loadBundle reads a file", loadBundle(file)?.sources.length === 3);
check("loadBundle returns null for a missing file", loadBundle(path.join(tmp, "none.json")) === null);
fs.writeFileSync(file, "{not json");
check("loadBundle returns null for a damaged file", loadBundle(file) === null);

const absent = path.join(tmp, "none.json");
const fresh = (env: Record<string, string | undefined>) => {
  resetAdvisors();
  return loadAdvisors(env);
};
fs.writeFileSync(file, JSON.stringify(fixture));
const reviewFile = path.join(tmp, "review.json");
const primeFile = path.join(tmp, "prime.json");
fs.writeFileSync(reviewFile, JSON.stringify(sampleReview));
fs.writeFileSync(primeFile, JSON.stringify(samplePrime));
const production = { VERCEL_ENV: "production" };
const dev = { NODE_ENV: "development" };
check("env path selects the bundle origin", fresh({ BUCKET_ADVISOR_BUNDLE: file }).origin === "bundle");
check("a missing bundle falls back to the sample", fresh({ ...dev, BUCKET_ADVISOR_BUNDLE: absent }).origin === "sample");
check("BUCKET_ADVISOR_REVIEW takes precedence over the bundle", fresh({ ...dev, BUCKET_ADVISOR_REVIEW: absent, BUCKET_ADVISOR_BUNDLE: file }).origin === "sample");
check("preview keeps the sample", fresh({ VERCEL_ENV: "preview", BUCKET_ADVISOR_BUNDLE: absent }).sources.length === 6);
check("production without a bundle returns no advisors", (() => {
  const got = fresh({ ...production, BUCKET_ADVISOR_BUNDLE: absent });
  return got.sources.length === 0 && got.axes.length === 0 && got.origin === "none" && got.sample === false;
})());
check("production with a damaged review returns no advisors", fresh({ ...production, BUCKET_ADVISOR_REVIEW: absent }).origin === "none");
check("production with a review and no prime directions returns no advisors", fresh({ ...production, BUCKET_ADVISOR_REVIEW: reviewFile }).origin === "none");
check("production with a review and prime directions serves the review", (() => {
  const got = fresh({ ...production, BUCKET_ADVISOR_REVIEW: reviewFile, BUCKET_PRIME_DIRECTIONS: primeFile });
  return got.origin === "review" && got.sample === false && got.sources.length === 6;
})());
check("production with a bundle serves the bundle", fresh({ ...production, BUCKET_ADVISOR_BUNDLE: file }).origin === "bundle");
check("a changed env is never answered from the cache", loadAdvisors({ ...dev, BUCKET_ADVISOR_BUNDLE: absent }).origin === "sample" && loadAdvisors({ ...production, BUCKET_ADVISOR_BUNDLE: absent }).origin === "none");
check("an unset environment returns no advisors", fresh({ BUCKET_ADVISOR_BUNDLE: absent }).origin === "none" && fresh({ BUCKET_ADVISOR_BUNDLE: absent }).sources.length === 0);
check("a self-hosted production build returns no advisors", fresh({ NODE_ENV: "production", BUCKET_ADVISOR_BUNDLE: absent }).origin === "none");
check("an unset environment still serves a real bundle", fresh({ BUCKET_ADVISOR_BUNDLE: file }).origin === "bundle");
check("samples need a positive preview, development or test signal", (() => {
  const on = [{ VERCEL_ENV: "preview" }, { VERCEL_ENV: "development" }, { VERCEL_ENV: "preview", NODE_ENV: "production" }, { NODE_ENV: "development" }, { NODE_ENV: "test" }];
  const off = [{}, production, { NODE_ENV: "production" }, { VERCEL_ENV: "production", NODE_ENV: "development" }, { VERCEL_ENV: "staging" }, { NODE_ENV: "" }, { VERCEL_ENV: "", NODE_ENV: "production" }];
  return on.every((e) => samplesAllowed(e)) && off.every((e) => !samplesAllowed(e));
})());
check("production search over no advisors returns no advisor hit", unify({ query: "quantum photon entropy", excerpts: [], advisors: fresh({ ...production, BUCKET_ADVISOR_BUNDLE: absent }).sources }).length === 0);
check("the production switcher drops the sample data set", !listDatasets([], [], false).some((e) => e.id === SAMPLE_DATASET) && listDatasets([], [], true).some((e) => e.id === SAMPLE_DATASET) && dataParam(SAMPLE_DATASET, listDatasets([], [], false)) === "canon");
check("default path points at the local advisor review folder", DEFAULT_BUNDLE_PATH.endsWith(path.join(".local", "share", "bucket-advisor-review", "advisor-bundle.json")));
check("origin labels read as the UI strings", ORIGIN_LABEL.bundle === "source: local advisor bundle" && ORIGIN_LABEL.sample === "source: sample" && ORIGIN_LABEL.none === "no advisors published");
check("no real bundle is committed", !fs.existsSync("src/data/advisor-bundle.json") && fs.statSync("src/lib/explore/fixtures/advisor-bundle.sample.json").size < 5000);

const withComplement = publicRow({ rank: 1, name: "A", score: 0.5, star_prime: [0.9, 0.2], complement: 0.35, complement_directions: ["alpha", "beta", "c", "d"], note: "x" });
check("complement and its directions survive parsing, capped at three", withComplement?.complement === 0.35 && withComplement.complement_directions.length === 3 && !("complement" in withComplement.fields));
const withoutComplement = publicRow({ rank: 1, name: "A", score: 0.5, complement: "high" });
check("a row without a numeric complement parses to null and no directions", withoutComplement?.complement === null && withoutComplement.complement_directions.length === 0);

const unrankedRows = [
  { name: "Invented Person One", order_status: "untested", institution: "Made-up Institute", field: "Made-up studies", reasons: ["Shares the topic lantern optics."], star_prime: [0.9, 0.1] },
  { name: "Invented Person Two", order_status: "untested", institution: "Made-up Institute", field: "Made-up studies", reasons: ["Shares the topic lantern optics."], star_prime: [0.2, 0.8] },
  { name: "Invented Person Three", order_status: "withheld", institution: "Placeholder College", field: "Made-up studies", rank: 4, score: 0.9, percentile: 99, star_prime: [0.5, 0.5] },
  { name: "Invented Person Two", order_status: "untested", institution: "Made-up Institute", field: "Made-up studies", star_prime: [0.4, 0.4] },
];
const prime = parsePrimeDirections(samplePrime);
const unrankedReview = (rows: unknown[]) => parseAdvisorReview({ schema: "bucket.advisor-review/1", rows });
const unranked = advisorSources(unrankedReview(unrankedRows), prime);
check("the parser stores a position for unranked rows, and the Explore reader drops it", unrankedReview(unrankedRows).rows.map((r) => r.rank).join() === "1,2,3,4" && unranked.every((s) => s.rank === 0 && s.score === 0));
check("unranked rows carry their order and a key that holds no position", unranked.map((s) => s.order).join() === "untested,untested,withheld,untested" && unranked.every((s) => /^u[0-9a-f]{12}(-\d+)?$/.test(s.key ?? "")) && new Set(unranked.map(advisorId)).size === 4 && !unranked.some((s) => /^advisor:\d+$/.test(advisorId(s))));
const reversed = advisorSources(unrankedReview([unrankedRows[2], unrankedRows[1], unrankedRows[0]]), prime);
check("an unranked id does not change with the row's place in the file", advisorId(reversed[0]) === advisorId(unranked[2]) && advisorId(reversed[2]) === advisorId(unranked[0]));
check("the order status stays out of the searchable text", unranked.every((s) => !/untested|withheld/.test(s.text)));
const unrankedHits = unify({ query: "lantern optics", excerpts: [], advisors: unranked }).filter((h) => h.type === "advisor");
check("an unranked advisor hit says untested ordering and shows no position", unrankedHits.length >= 2 && unrankedHits.every((h) => h.subtitle === `Made-up studies, ${UNTESTED_ORDERING}` && !/^advisor:\d+$/.test(h.id) && !/\brank\b|percentile/i.test(JSON.stringify(h))));
const ranked = advisorSources(unrankedReview([{ name: "Invented Person Four", order_status: "tested", rank: 7, score: 0.6, field: "Made-up studies" }, { name: "Invented Person Five", rank: 2, score: 0.4, field: "Made-up studies" }]), prime);
check("tested rows and rows with no status keep their rank and id", ranked.map(advisorId).join() === "advisor:2,advisor:7" && ranked.every((s) => s.order === undefined && s.key === undefined && s.score > 0));
check("a ranked advisor hit carries no untested wording", unify({ query: "made-up studies", excerpts: [], advisors: ranked }).filter((h) => h.type === "advisor").every((h) => h.subtitle === "Made-up studies"));
check("the reply names the untested ordering only when unranked rows are present", advisorsOrder(unranked).advisors_order === UNTESTED_ORDERING && !("advisors_order" in advisorsOrder(ranked)));

const reviewDir = fs.mkdtempSync(path.join(os.tmpdir(), "advisor-unranked-"));
fs.writeFileSync(path.join(reviewDir, "review.json"), JSON.stringify({ schema: "bucket.advisor-review/1", rows: unrankedRows }));
fs.writeFileSync(path.join(reviewDir, "prime.json"), JSON.stringify(samplePrime));
resetAdvisors();
const supplied = loadAdvisors({ NODE_ENV: "production", BUCKET_ADVISOR_REVIEW: path.join(reviewDir, "review.json"), BUCKET_PRIME_DIRECTIONS: path.join(reviewDir, "prime.json") });
check("a founder-supplied review of unranked rows loads with no position", supplied.origin === "review" && supplied.sources.length === 4 && supplied.sources.every((s) => s.rank === 0 && s.score === 0 && s.order !== undefined));
const unrankedDeps = { canon: () => ({ ok: true as const, mode: "lexical" as const, results: [] }), advisors: () => supplied, sources: () => [], yearOf: () => null, canonFiles: () => [] };
void (async () => {
  const mapReply = (await exploreSearch(unrankedDeps as never, new URL("http://local/x?map=1"))).body as { advisors_order?: string; advisors: { id: string }[] };
  const ids = mapReply.advisors.map((a) => a.id);
  check("the map reply names the untested ordering and lists unranked advisors by key", mapReply.advisors_order === UNTESTED_ORDERING && ids.length === 4 && ids.join() === ids.slice().sort().join() && !ids.some((id) => /^advisor:\d+$/.test(id)) && !/"rank"/.test(JSON.stringify(mapReply)));
  resetAdvisors();
  fs.rmSync(reviewDir, { recursive: true, force: true });
  finish();
})();

function finish() {
if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log("all passed");
}

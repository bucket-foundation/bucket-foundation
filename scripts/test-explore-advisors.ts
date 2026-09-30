import fs from "fs";
import os from "os";
import path from "path";
import { SPLIT_NOTE } from "../src/lib/explore/modes/map";
import { BundleError, isPublished, DEFAULT_BUNDLE_PATH, bundleAxes, bundleSources, bundleStar, loadAdvisors, loadBundle, parseAdvisorBundle, resetAdvisors } from "../src/lib/explore/advisors";
import { ORIGIN_LABEL } from "../src/lib/explore/advisor-origin";
import { hasEmail } from "../src/lib/research-os/advisor-review";
import { mapLayout } from "../src/lib/explore/modes/map";
import { unify } from "../src/lib/explore/search";
import fixture from "../src/lib/explore/fixtures/advisor-bundle.sample.json";

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

const saved = { ...process.env };
function fresh(env: Record<string, string | undefined>) {
  for (const k of ["BUCKET_ADVISOR_REVIEW", "BUCKET_ADVISOR_BUNDLE"]) delete process.env[k];
  Object.assign(process.env, env);
  resetAdvisors();
  return loadAdvisors();
}
fs.writeFileSync(file, JSON.stringify(fixture));
check("env path selects the bundle origin", fresh({ BUCKET_ADVISOR_BUNDLE: file }).origin === "bundle");
check("a missing bundle falls back to the sample", fresh({ BUCKET_ADVISOR_BUNDLE: path.join(tmp, "none.json") }).origin === "sample");
check("BUCKET_ADVISOR_REVIEW takes precedence over the bundle", fresh({ BUCKET_ADVISOR_REVIEW: path.join(tmp, "none.json"), BUCKET_ADVISOR_BUNDLE: file }).origin === "sample");
check("default path points at the local advisor review folder", DEFAULT_BUNDLE_PATH.endsWith(path.join(".local", "share", "bucket-advisor-review", "advisor-bundle.json")));
check("origin labels read as the UI strings", ORIGIN_LABEL.bundle === "source: local advisor bundle" && ORIGIN_LABEL.sample === "source: sample");
check("no real bundle is committed", !fs.existsSync("src/data/advisor-bundle.json") && fs.statSync("src/lib/explore/fixtures/advisor-bundle.sample.json").size < 5000);
Object.assign(process.env, saved);

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log("all passed");

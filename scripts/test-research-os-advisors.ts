import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { cosine, project, projector, scrub, statementBody, tokens, type AdvisorSpace } from "../src/lib/research-os/advisors/project";
import { diversify, matchAdvisors, percentiles, type AdvisorProfile } from "../src/lib/research-os/advisors/match";
import { csvCell, shortlistCsv } from "../src/lib/research-os/advisors/csv";

type Bundle = {
  space: AdvisorSpace;
  profiles: { openalex_id: string; name: string; institution: string; ror: string; country: string; field: string; topics: string[]; links: Record<string, string>; scores: number[] }[];
  fixtures: { text: string; query_whitened: number[]; top: { openalex_id: string; score: number }[] }[];
};

const bundle: Bundle = JSON.parse(readFileSync(path.join(__dirname, "../src/lib/research-os/advisors/parity-fixture.json"), "utf8"));
const p = projector(bundle.space);
const profiles: AdvisorProfile[] = bundle.profiles.map((r) => ({
  openalexId: r.openalex_id, name: r.name, institution: r.institution, ror: r.ror, country: r.country,
  field: r.field, topics: r.topics, links: r.links, scores: r.scores,
}));

test("projection matches the Python pipeline on every fixture text", () => {
  assert.ok(bundle.fixtures.length >= 6);
  for (const f of bundle.fixtures) {
    const q = project(p, f.text);
    q.whitened.forEach((v, i) => assert.ok(Math.abs(v - f.query_whitened[i]) < 1e-6, `component ${i} of ${JSON.stringify(f.text.slice(0, 30))}: ${v} vs ${f.query_whitened[i]}`));
    const scores = profiles.map((pr) => cosine(pr.scores, q.whitened));
    f.top.forEach((t, r) => {
      const i = profiles.findIndex((pr) => pr.openalexId === t.openalex_id);
      assert.ok(Math.abs(scores[i] - t.score) < 1e-6, `rank ${r} score`);
    });
  }
});

test("tokens drop stop words, digits-first tokens and markup", () => {
  assert.deepEqual(tokens("The cell's 3D model at https://x.org/y and $k_BT$ \\alpha émile"), ["cell", "model", "émile"]);
  assert.equal(scrub("see [a](https://b.c) <b>x</b>").includes("https"), false);
  assert.equal(statementBody("# T\nbody\n## References\n[1] x"), "# T\nbody");
});

test("match ranks the matching field first, pages, and caps institutions", () => {
  const r = matchAdvisors(p, profiles, bundle.fixtures[0].text, { cap: null });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.results.length, 25);
  assert.equal(r.results[0].rank, 1);
  assert.ok(r.results.every((x, i, a) => i === 0 || a[i - 1].score >= x.score));
  assert.ok(!("scores" in r.results[0]));
  const page2 = matchAdvisors(p, profiles, bundle.fixtures[0].text, { cap: null, offset: 25 });
  assert.ok(page2.ok && page2.results[0].rank === 26);
  const capped = matchAdvisors(p, profiles, bundle.fixtures[0].text, { cap: 5 });
  assert.ok(capped.ok && capped.results.length === 25);
});

test("too few known terms is refused", () => {
  const r = matchAdvisors(p, profiles, "1234 5678 ___");
  assert.deepEqual(r, { ok: false, reason: "too_few_terms", queryTerms: 0 });
});

test("percentiles use max rank for ties and diversify keeps everyone", () => {
  assert.deepEqual(percentiles([0.1, 0.5, 0.3, 0.5]), [0, 100, 100 / 3, 100]);
  const rows = Array.from({ length: 20 }, (_, i) => ({ id: i, institution: i < 8 ? "A" : `B${i}` }));
  const out = diversify(rows, 5, 10);
  assert.equal(out.length, 20);
  assert.equal(out.slice(0, 10).filter((r) => r.institution === "A").length, 5);
});

test("csv guard neutralizes formulas and quotes", () => {
  assert.equal(csvCell("=HYPERLINK(1)"), `"'=HYPERLINK(1)"`);
  assert.equal(csvCell('a "b"'), `"a ""b"""`);
  assert.equal(csvCell(["x", "=y"]), `"x; =y"`);
  const csv = shortlistCsv([{ decision: "yes", rank: 1, name: "-N", institution: "I", country: "US", field: "F", score: 0.5, percentile: 99, links: { openalex: "https://openalex.org/A1" }, shared: ["t"] }]);
  assert.ok(csv.split("\n")[1].includes(`"'-N"`));
});

test("docx paragraphs, tabs, breaks and entities come through; file kinds resolve", async () => {
  const { docxXmlToText, kindOf, decodeXml } = await import("../src/lib/research-os/advisors/extract");
  const xml = `<w:document><w:body><w:p><w:r><w:t>Mitochondria &amp; light</w:t></w:r><w:r><w:tab/><w:t xml:space="preserve"> in cells</w:t></w:r></w:p><w:p></w:p><w:p><w:r><w:t>Line</w:t><w:br/><w:t>two &#233;&#x2014;</w:t></w:r></w:p></w:body></w:document>`;
  assert.equal(docxXmlToText(xml), "Mitochondria & light\t in cells\nLine\ntwo é—");
  assert.equal(decodeXml("&#0;&#x110000;&bogus;"), "&bogus;");
  assert.equal(kindOf("cv.PDF", ""), "pdf");
  assert.equal(kindOf("cv.docx", ""), "docx");
  assert.equal(kindOf("notes.md", ""), "text");
  assert.equal(kindOf("x.exe", "application/octet-stream"), null);
});

test("a real docx built with jszip reads back", async () => {
  const { default: JSZip } = await import("jszip");
  const { docxToText } = await import("../src/lib/research-os/advisors/extract");
  const zip = new JSZip();
  zip.file("word/document.xml", `<w:document><w:body><w:p><w:r><w:t>Protein folding</w:t></w:r></w:p></w:body></w:document>`);
  const buf = await zip.generateAsync({ type: "arraybuffer" });
  assert.equal(await docxToText(buf), "Protein folding");
  const empty = await new JSZip().generateAsync({ type: "arraybuffer" });
  await assert.rejects(docxToText(empty), /document\.xml/);
});

test("the loader rejects synthetic, malformed and email-carrying bundles", async () => {
  const { checkBundle } = await import("./research-os/load-advisors");
  assert.ok(checkBundle(bundle as never).some((p) => p.includes("synthetic")));
  const real = { ...bundle, counts: {} };
  assert.deepEqual(checkBundle(real as never), []);
  const leaky = { ...real, profiles: [{ ...bundle.profiles[0], email: "x@y.z" }] };
  assert.ok(checkBundle(leaky as never).some((p) => p.includes("email")));
  const short = { ...real, profiles: [{ ...bundle.profiles[0], scores: [1] }] };
  assert.ok(checkBundle(short as never).some((p) => p.includes("wrong length")));
  assert.ok(checkBundle({ ...real, space: { ...bundle.space, schema: "x" } } as never).length > 0);
});

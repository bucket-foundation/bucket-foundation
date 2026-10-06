import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import report from "../src/lib/research-os/solvability-frontier-report-data.json";
import makeupData from "../src/lib/research-os/solvability-makeup-data.json";
import { MAKEUP_CHARTS, makeupSummary, pipelineSteps, sourceRows, type MakeupData } from "../src/lib/research-os/solvability-frontier-provenance";
import SolvabilityFrontierReport from "../src/components/research-os/views/SolvabilityFrontierReport";
import { cutoffSummary, methodParagraphs, rateSentence, reportMarkdown, verdict, weakParagraphs, type ReportData } from "../src/lib/research-os/solvability-frontier-report-copy";
import { REACH_CLASSES } from "../src/lib/research-os/solvability-predictions";

const ROOT = path.join(__dirname, "..");
const data = report as unknown as ReportData;
const makeup = makeupData as unknown as MakeupData;
const TAGGED = /\[(bm|bm-open):[A-Za-z0-9_.']+\]|\[empirical:[^\]]+\]/;

test("the report page renders every section from the committed data", () => {
  const html = renderToStaticMarkup(createElement(SolvabilityFrontierReport, { data, makeup, svg: "<svg viewBox=\"0 0 10 10\"></svg>" }));
  for (const heading of ["frontier", "per branch", "provenance", "pipeline", "data make-up", "backtest, cutoff 2005", "backtest, cutoff 2021", "method", "where this is weak", "the atlas problems"]) assert.ok(html.includes(`>${heading}<`), heading);
  assert.ok(html.indexOf(">provenance<") < html.indexOf(">pipeline<") && html.indexOf(">pipeline<") < html.indexOf(">data make-up<") && html.indexOf(">data make-up<") < html.indexOf(">backtest, cutoff 2005<"));
  assert.ok(html.indexOf(">where this is weak<") < html.indexOf(">predictions: close to known results<"));
  assert.ok(html.indexOf(">backtest, cutoff 2021<") < html.indexOf(">where this is weak<"));
  assert.ok(html.includes("settled: solved only") && html.includes("settled or advanced: solved or partial"));
  assert.ok(html.includes("all undecided inside"));
  for (const k of REACH_CLASSES) assert.ok(html.includes(`>predictions: ${k}<`), k);
  assert.ok(html.includes("<svg"));
  assert.ok(html.includes("under 10"));
  assert.equal(data.predictions.atlas.length > 20, true);
  for (const r of data.predictions.atlas) assert.ok(html.includes(r.id), r.id);
});

test("the page sits behind the solvability launch gate", () => {
  const layout = readFileSync(path.join(ROOT, "src", "app", "research-os", "(app)", "solvability", "layout.tsx"), "utf8");
  assert.match(layout, /gateLaunchPage\("\/research-os\/solvability"\)/);
  assert.ok(existsSync(path.join(ROOT, "src", "app", "research-os", "(app)", "solvability", "frontier", "page.tsx")));
  assert.ok(!existsSync(path.join(ROOT, "src", "app", "research-os", "(app)", "solvability", "frontier", "layout.tsx")));
});

test("every sentence with a number in the method and backtest copy carries a math-contract tag", () => {
  const copy = [...methodParagraphs(data), ...data.backtest.cutoffs.flatMap((c) => cutoffSummary(c, data))];
  for (const p of copy) assert.match(p, TAGGED, p.slice(0, 80));
  for (const c of data.backtest.cutoffs) for (const k of c.codings) for (const s of [...k.byLength, ...k.byBranch]) assert.ok(rateSentence(s, data.backtest.floor).length > 10);
  assert.match(verdict(data), /settled only/);
  assert.ok(weakParagraphs(data).length >= 6);
});

test("the top tables hold at most 50 rows per class and the classes cover only open top-level problems", () => {
  const total = Object.values(data.predictions.counts).reduce((a, b) => a + b, 0);
  const open = data.frontier.counts.reachable + data.frontier.counts.beyond + data.frontier.counts.unsampled;
  assert.ok(total > 0 && total <= open);
  for (const k of REACH_CLASSES) assert.ok(data.predictions.top[k].length <= 50, k);
});

test("bm.py lint accepts the report copy", () => {
  const bm = path.join(ROOT, "tools", "bucketmath", "bm.py");
  if (!existsSync(bm)) return;
  const dir = path.join(os.homedir(), ".cache", "bucket-atlas");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "frontier-report-copy.md");
  writeFileSync(file, [reportMarkdown(data), "## Provenance", "", makeupSummary(makeup), "", ...pipelineSteps(data, makeup).flatMap((s) => [`${s.title}. ${s.formula}`, "", s.text, ""])].join("\n"));
  const out = execFileSync("python3", [bm, "lint", file], { cwd: ROOT, encoding: "utf8" });
  assert.ok(!/names nothing|cite it as|without \[bm:\]/.test(out), out);
});

test("the provenance section covers every source, every step and every chart with tagged numbers", () => {
  const rows = sourceRows(makeup);
  assert.equal(rows.reduce((a, r) => a + r.rows, 0), makeup.rows);
  for (const r of rows) assert.ok(r.taken.length > 10 && r.done.length > 10 && r.licence.length > 2, r.source);
  const steps = pipelineSteps(data, makeup);
  assert.ok(steps.length >= 12);
  for (const s of steps) {
    assert.ok(s.formula.length > 5, s.title);
    if (/\d/.test(s.text)) assert.ok(TAGGED.test(s.text), s.title);
  }
  assert.ok(TAGGED.test(makeupSummary(makeup)));
  for (const [key] of MAKEUP_CHARTS) if (key !== "openalex_works_by_branch" || makeup.openalex) assert.ok(existsSync(path.join(ROOT, "public", "atlas", "makeup", `${key}.webp`)), key);
  for (const lab of Object.values(makeup.labels)) assert.equal(Object.values(lab.counts).reduce((a, b) => a + b, 0) + lab.absent, makeup.rows, lab.title);
});

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import report from "../src/lib/research-os/solvability-frontier-report-data.json";
import SolvabilityFrontierReport from "../src/components/research-os/views/SolvabilityFrontierReport";
import { cutoffSummary, methodParagraphs, rateSentence, reportMarkdown, weakParagraphs, type ReportData } from "../src/lib/research-os/solvability-frontier-report-copy";
import { REACH_CLASSES } from "../src/lib/research-os/solvability-predictions";

const ROOT = path.join(__dirname, "..");
const data = report as unknown as ReportData;
const TAGGED = /\[(bm|bm-open):[A-Za-z0-9_.']+\]|\[empirical:[^\]]+\]/;

test("the report page renders every section from the committed data", () => {
  const html = renderToStaticMarkup(createElement(SolvabilityFrontierReport, { data, svg: "<svg viewBox=\"0 0 10 10\"></svg>" }));
  for (const heading of ["frontier", "per branch", "backtest, cutoff 2005", "backtest, cutoff 2021", "method", "where this is weak", "the atlas problems"]) assert.ok(html.includes(`>${heading}<`), heading);
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
  for (const c of data.backtest.cutoffs) for (const s of [...c.byLength, ...c.byBranch]) assert.ok(rateSentence(s, data.backtest.floor).length > 10);
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
  writeFileSync(file, reportMarkdown(data));
  const out = execFileSync("python3", [bm, "lint", file], { cwd: ROOT, encoding: "utf8" });
  assert.ok(!/names nothing|cite it as|without \[bm:\]/.test(out), out);
});

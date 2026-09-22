/**
 * A 503 that a retry might clear reads differently from a deployment
 * that was never configured, in every client that renders one.
 *
 * Six clients had the same shape: record the status, never read the
 * body, render "unavailable on this deployment" for any 503. Four of
 * them were still doing it a round after the rule was written, because
 * the rule lived in the two files that had been repaired
 * (Bucket critic C59, C73).
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { OUTAGE_COPY, UNCONFIGURED, UNCONFIGURED_COPY, isTransientOutage } from "../src/lib/research-os/outage";

const root = path.join(__dirname, "..");
const CLIENTS = path.join(root, "src/app/research-os");

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...tsxFiles(full));
    else if (entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

test("the two cases are told apart, and only by the code", () => {
  assert.equal(isTransientOutage(503, "access_unavailable"), true);
  assert.equal(isTransientOutage(503, "loop_unavailable"), true);
  assert.equal(isTransientOutage(503, "graph_read_failed"), true);
  assert.equal(isTransientOutage(503, UNCONFIGURED), false, "the one code a retry cannot clear");
  assert.equal(isTransientOutage(503, null), false, "no code is not evidence of an outage");
  assert.equal(isTransientOutage(500, "loop_unavailable"), false, "and it is a 503 rule");
  assert.equal(isTransientOutage(null, "loop_unavailable"), false);
});

test("the two messages say different things, and the retryable one offers a retry", () => {
  assert.notEqual(OUTAGE_COPY.title, UNCONFIGURED_COPY.title);
  assert.match(OUTAGE_COPY.body, /try again/i);
  assert.ok(!/try again/i.test(UNCONFIGURED_COPY.body), "a deployment with no graph is not worth retrying");
});

test("every client that renders a 503 reads a code first", () => {
  const offenders: string[] = [];
  for (const file of tsxFiles(CLIENTS)) {
    const src = fs.readFileSync(file, "utf8");
    if (!/status === 503/.test(src)) continue;
    if (/isTransientOutage/.test(src)) continue;
    offenders.push(path.relative(root, file));
  }
  assert.deepEqual(
    offenders,
    [],
    `these clients render a 503 without reading the code, so a passing outage reads as a broken install: ${offenders.join(", ")}`,
  );
});

test("the permanent copy is written once", () => {
  const copies = tsxFiles(CLIENTS).filter((f) => /unavailable on this deployment/.test(fs.readFileSync(f, "utf8")));
  assert.deepEqual(
    copies.map((f) => path.relative(root, f)),
    [],
    "the string lives in outage.ts, so changing it changes every surface at once",
  );
});

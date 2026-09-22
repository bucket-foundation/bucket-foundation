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
import { OUTAGE_COPY, TRANSIENT_CODES, UNCONFIGURED, UNCONFIGURED_COPY, isTransientOutage } from "../src/lib/research-os/outage";

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

test("only a named code is transient", () => {
  for (const code of ["busy", "access_unavailable", "loop_unavailable", "graph_read_failed", "node_read_failed", "consent_unavailable"]) {
    assert.equal(isTransientOutage(503, code), true, `${code} passes`);
  }
  assert.equal(isTransientOutage(503, UNCONFIGURED), false, "the deployment has no graph behind it");
  assert.equal(isTransientOutage(500, "loop_unavailable"), false, "and it is a 503 rule");
  assert.equal(isTransientOutage(null, "loop_unavailable"), false);
});

test("a permanent misconfiguration is not offered a retry", () => {
  // Six live 503s say a key or a vendor is not configured. The first
  // version of this rule called every one of them retryable, because it
  // named what was permanent instead of what passes.
  for (const code of [
    "vendor_not_configured",
    "The diagnostic probe isn't enabled yet (set LLM_BASE_URL or ANTHROPIC_API_KEY).",
    "Probe grading credentials are invalid on the server.",
    "Check isn't enabled yet (set LLM_BASE_URL or ANTHROPIC_API_KEY).",
    "Check credentials are invalid on the server.",
    "Organize isn't enabled yet (set LLM_BASE_URL or ANTHROPIC_API_KEY).",
  ]) {
    assert.equal(isTransientOutage(503, code), false, `no retry clears: ${code.slice(0, 40)}`);
  }
});

test("a 503 with no body is a gateway, and those pass", () => {
  assert.equal(isTransientOutage(503, null), true, "a CDN or platform 503 carries no JSON");
  assert.equal(isTransientOutage(503, ""), true);
});

test("every 503 the routes emit is classified on purpose", () => {
  // The rule is only as good as its coverage of what ships.
  const dir = path.join(__dirname, "..", "src/app/api/research-os");
  const codes = new Set<string>();
  const walk = (d: string): void => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts")) {
        const matches = fs.readFileSync(full, "utf8").match(/bad\(503,\s*"[^"]+"/g) || [];
        for (const m of matches) codes.add(m.replace(/^bad\(503,\s*"/, "").replace(/"$/, ""));
      }
    }
  };
  walk(dir);
  assert.ok(codes.size >= 5, `found ${codes.size} distinct 503 codes`);
  const unknown = Array.from(codes).filter((c) => c !== UNCONFIGURED && !TRANSIENT_CODES.has(c) && !/enabled yet|credentials are invalid|not_configured/.test(c));
  assert.deepEqual(
    unknown,
    [],
    `these 503 codes are neither the permanent one, a named transient one, nor a recognised misconfiguration, so nobody has decided what they mean: ${unknown.join(", ")}`,
  );
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

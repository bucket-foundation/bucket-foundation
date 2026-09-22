/**
 * A 503 that a retry might clear reads differently from a deployment
 * that was never configured, in every client that renders one.
 *
 * Six clients had the same shape: record the status, never read the
 * body, render "unavailable on this deployment" for any 503
 * (Bucket critic C59, C73). Repairing those six left a second set
 * untouched, because this file only examined a client that spelled
 * `status === 503`, and a client that reads `data.error` and prints it
 * renders a 503 without ever comparing the status. Five did, against
 * routes that answer `busy`, so a lock wait reached a teacher as the
 * bare word "busy" (F1).
 *
 * The gate is the route now. A client that calls a route which can
 * answer a retryable 503 has to consult the rule, whatever spelling it
 * uses to render one.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { OUTAGE_COPY, TRANSIENT_CODES, UNCONFIGURED, UNCONFIGURED_COPY, isTransientOutage } from "../src/lib/research-os/outage";

const root = path.join(__dirname, "..");
const CLIENTS = path.join(root, "src/app/research-os");

/** A 503 reaches a client three ways in this tree: bad(503, "code"),
 * reply({ status: 503, body: { error: "code" } }) and
 * NextResponse.json({ error: "code" }, { status: 503 }). Matching the
 * helper alone missed the last two, which is where `busy` lives. */
const PERMANENT = /enabled yet|credentials are invalid|not_configured/;

export function emittedCodes(roots: string[]): Set<string> {
  const codes = new Set<string>();
  const walk = (d: string): void => {
    if (!fs.existsSync(d)) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith(".ts")) continue;
      const src = fs.readFileSync(full, "utf8");
      for (const m of src.match(/bad\(\s*503\s*,\s*"[^"]+"/g) || []) {
        codes.add(m.replace(/^bad\(\s*503\s*,\s*"/, "").replace(/"$/, ""));
      }
      // The other two spellings put the code and the status in one
      // expression, so the window is the statement holding the 503 and
      // nothing before it. A 240-character window read backwards across
      // a statement boundary and picked up the `forbidden` from the
      // 403 above it.
      let at = src.indexOf("status: 503");
      while (at !== -1) {
        // The statement around the 503, both sides. `bad` and
        // NextResponse.json put the code first; reply({ status, body })
        // puts it second, so a window that only reads backwards misses
        // every route built on the reply helper.
        const before = Math.max(src.lastIndexOf(";", at), src.lastIndexOf("return", at), src.lastIndexOf("{\n", at));
        const semi = src.indexOf(";", at);
        const stmt = src.slice(before === -1 ? 0 : before, semi === -1 ? at + 240 : semi);
        const err = stmt.match(/error:\s*"([^"]+)"/g);
        if (err && err.length) codes.add(err[err.length - 1].replace(/^error:\s*"/, "").replace(/"$/, ""));
        at = src.indexOf("status: 503", at + 1);
      }
    }
  };
  for (const r of roots) walk(r);
  return codes;
}

/** Every `.ts` and `.tsx` under these roots. The first version walked
 * `.tsx` alone, so a client in a `.ts` file was invisible by construction. */
function clientFiles(roots: string[]): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) out.push(full);
    }
  };
  for (const r of roots) walk(r);
  return out;
}

/** The route names that can answer a 503 a retry might clear, either in
 * their own file or through a helper that does. */
function routesEmittingTransient(apiRoot: string): Set<string> {
  const names = new Set<string>();
  if (!fs.existsSync(apiRoot)) return names;
  const helpers = /evidence-errors/;
  for (const entry of fs.readdirSync(apiRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = path.join(apiRoot, entry.name, "route.ts");
    if (!fs.existsSync(file)) continue;
    const src = fs.readFileSync(file, "utf8");
    const emitsHere = Array.from(TRANSIENT_CODES).some((c) => src.includes(`"${c}"`));
    if (emitsHere || helpers.test(src)) names.add(entry.name);
  }
  return names;
}

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...tsxFiles(full));
    else if (entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

test("a named code and an unclassified one both earn a retry", () => {
  // The two codes a route in this tree emits at 503 for a read that
  // failed. The list held four more that nothing emits, written for
  // routes on branches that have not landed.
  for (const code of ["busy", "node_read_failed"]) {
    assert.equal(isTransientOutage(503, code), true, `${code} passes`);
  }
  // Emitted by nothing in this tree, so each is an unclassified code. An
  // unclassified 503 earns a retry rather than a claim that the
  // deployment has no graph behind it. These four are the transient
  // codes of branches that have not landed, and the gate will make
  // whichever lands name itself.
  for (const code of ["access_unavailable", "loop_unavailable", "graph_read_failed", "consent_unavailable"]) {
    assert.equal(isTransientOutage(503, code), true, `${code} is unclassified, so it is offered a retry`);
  }
  assert.equal(isTransientOutage(503, UNCONFIGURED), false, "the one code that says the deployment has no graph");
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

test("every 503 the routes emit is classified on purpose, and nothing else is listed", () => {
  // Both directions. The first version matched `bad(503, "…")` alone and
  // missed two other spellings that ship, so it asserted a closed set
  // over a subset that happened to exclude the only retryable code. It
  // also never checked the other way, which let four codes sit in
  // TRANSIENT_CODES that no route emits.
  const emitted = emittedCodes([
    path.join(root, "src/app/api/research-os"),
    path.join(root, "src/lib/research-os"),
  ]);
  assert.ok(emitted.has(UNCONFIGURED), "the permanent code is emitted somewhere");
  assert.ok(emitted.size >= 4, `found ${emitted.size} distinct 503 codes, which is fewer than ship`);

  const unclassified = Array.from(emitted).filter(
    (c) => c !== UNCONFIGURED && !TRANSIENT_CODES.has(c) && !PERMANENT.test(c),
  );
  assert.deepEqual(
    unclassified,
    [],
    `these 503 codes are neither the permanent one, a named transient one, nor a recognised misconfiguration, so nobody has decided what they mean: ${unclassified.join(", ")}`,
  );

  const dead = Array.from(TRANSIENT_CODES).filter((c) => !emitted.has(c));
  assert.deepEqual(
    dead,
    [],
    `these codes are called transient and no route emits them, so the rule reads as broader than it is: ${dead.join(", ")}`,
  );
});

test("the two messages say different things, and the retryable one offers a retry", () => {
  assert.notEqual(OUTAGE_COPY.title, UNCONFIGURED_COPY.title);
  assert.match(OUTAGE_COPY.body, /try again/i);
  assert.ok(!/try again/i.test(UNCONFIGURED_COPY.body), "a deployment with no graph is not worth retrying");
});

test("every client of a route that can answer busy consults the rule", () => {
  // The first version skipped any file without the literal `status ===
  // 503`, which is most of them: a client that reads `data.error` and
  // prints it renders a 503 without ever comparing the status, and five
  // such files sat against routes that emit `busy`. A learner saw the
  // word "busy" where a retry belonged.
  //
  // The route decides, and the spelling is left alone. A client that
  // calls a route which can answer a transient 503 has to consult
  // isTransientOutage.
  const transientRoutes = routesEmittingTransient(path.join(root, "src/app/api/research-os"));
  assert.ok(transientRoutes.size > 0, "some route answers a transient 503, or this gate checks nothing");

  const offenders: string[] = [];
  for (const file of clientFiles([path.join(root, "src/app/research-os"), path.join(root, "src/components")])) {
    const src = fs.readFileSync(file, "utf8");
    if (!/\bfetch\s*\(/.test(src)) continue;
    if (/isTransientOutage/.test(src)) continue;
    const called = Array.from(src.matchAll(/\/api\/research-os\/([a-z-]+)/g)).map((m) => m[1]);
    if (called.some((r) => transientRoutes.has(r))) offenders.push(path.relative(root, file));
  }
  assert.deepEqual(
    offenders.sort(),
    [],
    `these clients call a route that can answer a retryable 503 and never ask whether it did: ${offenders.join(", ")}`,
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

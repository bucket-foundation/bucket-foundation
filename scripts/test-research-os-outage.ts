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
import ts from "typescript";
import fs from "node:fs";
import path from "node:path";
import { OUTAGE_COPY, PERMANENT_CODES, PERMANENT_MESSAGE, TRANSIENT_CODES, UNCONFIGURED, UNCONFIGURED_COPY, isTransientOutage } from "../src/lib/research-os/outage";

const root = path.join(__dirname, "..");
const CLIENTS = path.join(root, "src/app/research-os");

/** A 503 reaches a client three ways in this tree: bad(503, "code"),
 * reply({ status: 503, body: { error: "code" } }) and
 * NextResponse.json({ error: "code" }, { status: 503 }). Matching the
 * helper alone missed the last two, which is where `busy` lives. */
// The rule's own regex, imported rather than copied. It was a second
// literal here, and it is the only thing standing between a permanent
// 503 and a retry button, so a copy that fell out of step would leave
// this test passing against a rule it no longer describes.
const PERMANENT = PERMANENT_MESSAGE;

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
      // Any helper taking (503, { error }). ros-ai-find built its own
      // `answer(status, body)` and emitted three codes through it, and a
      // scanner that knew three spellings by name saw none of them. The
      // shape rather than the helper's name is what this matches.
      for (const m of src.match(/\(\s*503\s*,\s*\{[^}]*error:\s*"[^"]+"/g) || []) {
        const err = m.match(/error:\s*"([^"]+)"/);
        if (err) codes.add(err[1]);
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
/** The source with every comment blanked and every offset kept, so a
 * position found in it is a position in the real file. A route named in
 * a docstring may be written in backticks, which no test on the
 * preceding character can tell from code. */
function withoutComments(src: string, source: ts.SourceFile): string {
  const out = src.split("");
  const blank = (from: number, to: number): void => {
    for (let i = from; i < to && i < out.length; i += 1) if (out[i] !== "\n") out[i] = " ";
  };
  const visit = (n: ts.Node): void => {
    for (const r of ts.getLeadingCommentRanges(src, n.getFullStart()) ?? []) blank(r.pos, r.end);
    for (const r of ts.getTrailingCommentRanges(src, n.getEnd()) ?? []) blank(r.pos, r.end);
    ts.forEachChild(n, visit);
  };
  ts.forEachChild(source, visit);
  return out.join("");
}

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

/** The route names that can answer a 503 a retry might clear.
 *
 * Read through emittedCodes rather than by probing for two words, so a
 * route that emits a transient code through a helper this file has
 * never heard of is still counted. A route importing evidence-errors
 * answers `busy` from inside that module, which no scan of the route's
 * own text can see, so that one import stays a named case. */
function routesEmittingTransient(apiRoot: string): Set<string> {
  const names = new Set<string>();
  if (!fs.existsSync(apiRoot)) return names;
  for (const entry of fs.readdirSync(apiRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(apiRoot, entry.name);
    const file = path.join(dir, "route.ts");
    if (!fs.existsSync(file)) continue;
    const emits = emittedCodes([dir]);
    const transient = Array.from(emits).some((c) => isTransientOutage(503, c));
    if (transient || /evidence-errors/.test(fs.readFileSync(file, "utf8"))) names.add(entry.name);
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
    (c) => !PERMANENT_CODES.has(c) && !TRANSIENT_CODES.has(c) && !PERMANENT.test(c),
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

test("every call to a route that can answer busy consults the rule", () => {
  // Per call, because per function is still a hatch: two fetches in one
  // body share one guard, so a guarded read immunized an unguarded write
  // beside it. The window for each call runs from that call to the next
  // one in the same block, which is where its own failure branch lives.
  //
  // The `fetch(` precondition is gone too. A client reaching a transient
  // route through a request wrapper never writes the word, and skipping
  // the file on that basis skipped the wrapper's callers by
  // construction.
  const transientRoutes = routesEmittingTransient(path.join(root, "src/app/api/research-os"));
  assert.ok(transientRoutes.size > 0, "some route answers a transient 503, or this gate checks nothing");

  const offenders: string[] = [];
  // src/lib/research-os too: a request wrapper there fetches a transient
  // route and its callers carry no route string, so dropping the
  // `fetch(` precondition moved the same hole to a different boundary.
  for (const file of clientFiles([
    path.join(root, "src/app/research-os"),
    path.join(root, "src/components"),
    path.join(root, "src/lib/research-os"),
  ])) {
    const src = fs.readFileSync(file, "utf8");
    const source = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);

    // Comments blanked, so a route named in a docstring stays prose. A
    // path in a docstring may be written in backticks, which no test on
    // the preceding character can tell from code.
    const code = withoutComments(src, source);
    const marks: number[] = [];
    const route = /\/api\/research-os\/([a-z-]+)/g;
    for (let m = route.exec(code); m !== null; m = route.exec(code)) {
      if (transientRoutes.has(m[1])) marks.push(m.index);
    }
    const dynamic = /\/api\/research-os\/\$\{/g;
    for (let m = dynamic.exec(code); m !== null; m = dynamic.exec(code)) marks.push(m.index);
    marks.sort((x, y) => x - y);
    if (marks.length === 0) continue;

    // Each call's window ends where the next one begins, so one guard
    // covers one call and no more.
    // Identifiers, because the guard was matched as raw text and a
    // comment carrying the word satisfied the gate.
    const guards: number[] = [];
    const collect = (n: ts.Node): void => {
      if (ts.isIdentifier(n) && (n.text === "isTransientOutage" || n.text === "readErrorCode")) guards.push(n.getStart(source));
      ts.forEachChild(n, collect);
    };
    ts.forEachChild(source, collect);

    for (let i = 0; i < marks.length; i += 1) {
      const from = marks[i];
      const to = i + 1 < marks.length ? marks[i + 1] : src.length;
      if (!guards.some((g) => g > from && g < to)) {
        const { line } = source.getLineAndCharacterOfPosition(from);
        offenders.push(`${path.relative(root, file)}:${line + 1}`);
      }
    }
  }
  assert.deepEqual(
    offenders.sort(),
    [],
    `these calls reach a route that can answer a retryable 503 and never ask whether it did: ${offenders.join(", ")}`,
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

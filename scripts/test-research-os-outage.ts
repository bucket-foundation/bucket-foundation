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
import { OUTAGE_COPY, PERMANENT_CODES, PERMANENT_MESSAGE, TRANSIENT_CODES, UNCONFIGURED, UNCONFIGURED_COPY, isTransientOutage, readErrorCode } from "../src/lib/research-os/outage";

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

/**
 * Calls that reach a transient-capable route and render nothing of
 * their own, with what renders the failure instead.
 *
 * A call like this used to satisfy the gate by computing the rule's
 * answer into a field nothing read. That passes the check and shows the
 * learner nothing, which is worse than failing it: the gate reports a
 * guarded call and the screen stays silent. So the dead computation
 * goes and the reason is written here, where `proof` has to match the
 * file that does the reporting.
 */
const SILENT: { file: string; route: string; because: string; reportedBy: string; proof: RegExp }[] = [
  {
    file: "src/app/research-os/(app)/workspace/page.tsx",
    route: "assignments",
    because: "this read only decides whether to redirect to an open assignment, and a failure leaves the learner where they are. It renders nothing, so a second outage message here would be the same failure twice on one screen",
    reportedBy: "src/app/research-os/(app)/workspace/AssignmentsBanner.tsx",
    // Anchored on a call. An earlier version matched the bare name, so
    // renaming the helper to isTransientOutageX kept the proof passing.
    proof: /\bisTransientOutage\s*\(/,
  },
];

test("a silent call names what reports its failure, and that still reports it", () => {
  for (const e of SILENT) {
    const reporter = path.join(root, e.reportedBy);
    assert.ok(fs.existsSync(reporter), `${e.file} says ${e.reportedBy} reports the failure, and it does not exist`);
    assert.match(fs.readFileSync(reporter, "utf8"), e.proof, `${e.reportedBy} no longer consults the rule, so ${e.file} reports nothing at all`);
    assert.ok(e.because.length > 40, `${e.file} needs a real reason`);
  }
});

/**
 * The name a function expression is bound to, through any wrapper.
 *
 * `const load = useCallback(async (url) => {...}, [])` binds the arrow
 * to the useCallback call, so a rule reading the immediate parent found
 * no name and the helper went undetected. Six helpers in this tree are
 * written that way, including `loadRoute` and `loadProbe`; a route
 * string handed to one of them was credited to whatever guard happened
 * to sit in the window.
 */
function namedBinding(n: ts.Node): string | null {
  let up: ts.Node = n;
  while (up.parent && (ts.isCallExpression(up.parent) || ts.isParenthesizedExpression(up.parent) || ts.isAsExpression(up.parent))) {
    up = up.parent;
  }
  if (up.parent && ts.isVariableDeclaration(up.parent) && ts.isIdentifier(up.parent.name)) return up.parent.name.text;
  return null;
}

test("a helper bound through useCallback is still a helper", () => {
  // The shape the old rule missed, with the guard and the fetch inside.
  const sf = ts.createSourceFile(
    "probe.tsx",
    `const load = useCallback(async (u: string) => {
       const r = await fetch(u);
       if (!r.ok) return isTransientOutage(r.status, await readErrorCode(r));
     }, []);`,
    ts.ScriptTarget.Latest,
    true,
  );
  const names: (string | null)[] = [];
  const visit = (n: ts.Node): void => {
    if (ts.isArrowFunction(n)) names.push(namedBinding(n));
    ts.forEachChild(n, visit);
  };
  ts.forEachChild(sf, visit);
  assert.deepEqual(names, ["load"], "the arrow inside useCallback is bound to `load`");
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

    // Comments blanked, so a route named in a docstring stays prose.
    // Testing the character before the path was the earlier shape, and
    // a docstring path written in backticks opens with a backtick, so
    // that test read it as a fetch. Blanking the comments sees it.
    //
    // Each mark carries its route, because an entry in SILENT names one
    // route in one file.
    const code = withoutComments(src, source);
    const marks: { at: number; route: string }[] = [];
    const route = /\/api\/research-os\/([a-z-]+)/g;
    for (let m = route.exec(code); m !== null; m = route.exec(code)) {
      if (transientRoutes.has(m[1])) marks.push({ at: m.index, route: m[1] });
    }
    const dynamic = /\/api\/research-os\/\$\{/g;
    for (let m = dynamic.exec(code); m !== null; m = dynamic.exec(code)) marks.push({ at: m.index, route: "(built from a template)" });
    marks.sort((x, y) => x.at - y.at);
    if (marks.length === 0) continue;

    // Each call's window ends where the next one begins, so one guard
    // covers one call and no more.
    // A call, and a call to the imported rule.
    //
    // Raw text came first, and a comment carrying the word satisfied the
    // gate. Identifiers came next, and a dead `void isTransientOutage;`
    // anywhere in the window satisfied it, as did shadowing the name
    // with `const isTransientOutage = () => false`. The guard has to be
    // called, and the name it is called by has to resolve through an
    // import of @/lib/research-os/outage rather than to a local of the
    // same name.
    const GUARD_NAMES = ["isTransientOutage", "readErrorCode"];
    const imported = new Set<string>();
    for (const st of source.statements) {
      if (!ts.isImportDeclaration(st) || !st.importClause) continue;
      const from = ts.isStringLiteral(st.moduleSpecifier) ? st.moduleSpecifier.text : "";
      if (!/research-os\/outage$/.test(from)) continue;
      const named = st.importClause.namedBindings;
      if (named && ts.isNamedImports(named)) {
        for (const el of named.elements) {
          const original = el.propertyName ? el.propertyName.text : el.name.text;
          if (GUARD_NAMES.includes(original)) imported.add(el.name.text);
        }
      }
    }
    // A local declaration of an imported name shadows it, and a shadowed
    // guard answers whatever the local says.
    const shadowed = new Set<string>();
    const findShadows = (n: ts.Node): void => {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && imported.has(n.name.text)) shadowed.add(n.name.text);
      if (ts.isFunctionDeclaration(n) && n.name && imported.has(n.name.text)) shadowed.add(n.name.text);
      ts.forEachChild(n, findShadows);
    };
    ts.forEachChild(source, findShadows);

    const guards: number[] = [];
    const collect = (n: ts.Node): void => {
      if (
        ts.isCallExpression(n) &&
        ts.isIdentifier(n.expression) &&
        imported.has(n.expression.text) &&
        !shadowed.has(n.expression.text)
      ) {
        guards.push(n.getStart(source));
      }
      ts.forEachChild(n, collect);
    };
    ts.forEachChild(source, collect);

    // A route string handed to a local helper rather than to fetch is
    // that helper's call, and the helper is where the code is read.
    // HomeClient's load<T>() captures it with readErrorCode and its
    // callers pass only a URL, so crediting the window alone reported
    // correct code as a defect.
    const helpers = new Set<string>();
    const findHelpers = (n: ts.Node): void => {
      if ((ts.isFunctionDeclaration(n) || ts.isArrowFunction(n) || ts.isFunctionExpression(n)) && n.body) {
        const name = ts.isFunctionDeclaration(n) && n.name ? n.name.text : namedBinding(n);
        if (name && /isTransientOutage|readErrorCode/.test(n.body.getText(source)) && /\bfetch\s*\(/.test(n.body.getText(source))) {
          helpers.add(name);
        }
      }
      ts.forEachChild(n, findHelpers);
    };
    ts.forEachChild(source, findHelpers);
    // The argument spans of every call to such a helper, so a route
    // string inside one is that helper's fetch rather than a bare one.
    const helperSpans: [number, number][] = [];
    const findCalls = (n: ts.Node): void => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && helpers.has(n.expression.text)) {
        helperSpans.push([n.arguments.pos, n.arguments.end]);
      }
      ts.forEachChild(n, findCalls);
    };
    ts.forEachChild(source, findCalls);
    const viaHelper = (at: number): boolean => helperSpans.some(([lo, hi]) => at >= lo && at < hi);

    const rel = path.relative(root, file);
    for (let i = 0; i < marks.length; i += 1) {
      const from = marks[i].at;
      const to = i + 1 < marks.length ? marks[i + 1].at : src.length;
      if (viaHelper(from)) continue;
      if (SILENT.some((e) => e.file === rel && e.route === marks[i].route)) continue;
      if (!guards.some((g) => g > from && g < to)) {
        const { line } = source.getLineAndCharacterOfPosition(from);
        offenders.push(`${rel}:${line + 1}`);
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
  // Comments blanked. The rule's subject is where the sentence is
  // defined, and a comment naming it is documentation. This file
  // already holds that a comment cannot answer for code; the same
  // reason says a comment cannot be accused as code, and the first
  // version of this rule failed a file whose only match was a comment
  // explaining the defect it had just fixed.
  const copies = tsxFiles(CLIENTS).filter((f) => {
    const src = fs.readFileSync(f, "utf8");
    return /unavailable on this deployment/.test(withoutComments(src, ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)));
  });
  assert.deepEqual(
    copies.map((f) => path.relative(root, f)),
    [],
    "the string lives in outage.ts, so changing it changes every surface at once",
  );
});

/**
 * A Response whose body is not JSON, which is what a gateway 503 is.
 *
 * Every repair in this branch turns on a `.catch` around `res.json()`,
 * and reverting any of them left the whole suite green: nothing anywhere
 * constructed a response that makes the parse throw.
 */
function gatewayResponse(status: number): Response {
  return new Response("<html><body>503 Service Unavailable</body></html>", {
    status,
    headers: { "content-type": "text/html" },
  });
}

test("a gateway 503 carries HTML, and reading its code answers null", async () => {
  const res = gatewayResponse(503);
  await assert.rejects(res.clone().json(), "the body is not JSON, which is the whole problem");
  assert.equal(await readErrorCode(gatewayResponse(503)), null, "readErrorCode absorbs the parse and answers null");
  assert.equal(isTransientOutage(503, null), true, "and a bare 503 earns a retry");
});

test("the guarded parse the clients use survives a gateway body", async () => {
  // The shape every repair on this branch writes. Without the catch this
  // throws, the caller's outer catch reports a network error, and the
  // rule is never consulted.
  const data = (await gatewayResponse(503).json().catch(() => ({}))) as { error?: string };
  assert.deepEqual(data, {}, "an unparseable body reads as no code");
  assert.equal(isTransientOutage(503, data.error ?? null), true, "which the rule answers as retryable");
});

test("a corpus read failure is its own class and is retryable", async () => {
  /* eslint-disable-next-line @typescript-eslint/no-var-requires */
  const { CorpusReadFailed, CorpusUnavailable } = require("../src/lib/research-os/evidence-search/server") as {
    CorpusReadFailed: new (m: string) => Error & { code?: string };
    CorpusUnavailable: new (m: string) => Error;
  };
  const failed = new CorpusReadFailed("permission denied");
  // CorpusReadFailed extends CorpusUnavailable, so the nearest existing
  // assertion, "a missing corpus dir throws CorpusUnavailable", is blind
  // to the classification by inheritance. This asserts the distinction
  // the branch added.
  assert.ok(failed instanceof CorpusUnavailable, "it is one");
  assert.equal(failed.name, "CorpusReadFailed", "and it says which one");
  assert.equal(isTransientOutage(503, "corpus_read_failed"), true, "a read that failed this minute earns a retry");
  assert.equal(isTransientOutage(503, "corpus_unavailable"), false, "a deployment with no corpus does not");
});

/**
 * `if (!<name>.ok)` as this statement's own condition.
 *
 * The first version of the rule below tested each following
 * statement's whole subtree text, so an ok check on any other response
 * anywhere later in the block answered for this one. The import page
 * parses `created` after returning on `!created.ok`, and the
 * `if (!attached.ok)` nested in the loop below it matched, which read a
 * correct sequence as the defect.
 */
function ownOkCheck(s: ts.Statement, name: string, source: ts.SourceFile): boolean {
  return ts.isIfStatement(s) && new RegExp(`!\\s*${name}\\.ok\\b`).test(s.expression.getText(source));
}

test("nothing parses a body and then asks whether the request succeeded", () => {
  // `const data = await res.json(); if (!res.ok) { ...data.error... }`
  // reads naturally and cannot work: a gateway 503 carries HTML, so the
  // parse throws before the branch is reached, the outer catch reports a
  // network error, and the rule is never consulted. Four files were
  // written this way, one of them forty-six lines above a line this
  // branch had already repaired.
  //
  // Parsing inside `if (res.ok)`, or in a `r.ok ? r.json() : fallback`,
  // only ever sees a 200 and is left alone.
  const offenders: string[] = [];
  let guarded = 0;
  for (const file of clientFiles([path.join(root, "src/app/research-os"), path.join(root, "src/components")])) {
    const src = fs.readFileSync(file, "utf8");
    if (!/\/api\/research-os\//.test(src)) continue;
    const source = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);
    const visit = (n: ts.Node): void => {
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === "json" && n.arguments.length === 0) {
        // The response this parse reads, so the status check that
        // answers for it has to be a check of the same one.
        const receiver = ts.isIdentifier(n.expression.expression) ? n.expression.expression.text : null;
        let top: ts.Node = n;
        while (
          top.parent &&
          (ts.isPropertyAccessExpression(top.parent) || ts.isCallExpression(top.parent) || ts.isAwaitExpression(top.parent) || ts.isParenthesizedExpression(top.parent) || ts.isAsExpression(top.parent))
        ) {
          top = top.parent;
        }
        // A parse whose own conditional already tested the status is
        // checked. `res.ok ? await res.json() : await res.json().catch(...)`
        // is the shape that puts the guard on the failure path alone,
        // and reading it as unguarded would have this rule demand the
        // thing it exists to produce.
        let conditioned = false;
        for (let up: ts.Node | undefined = n; up; up = up.parent) {
          if (ts.isConditionalExpression(up) && /\.(ok|status)\b/.test(up.condition.getText(source))) { conditioned = true; break; }
          if (ts.isFunctionDeclaration(up) || ts.isArrowFunction(up) || ts.isFunctionExpression(up)) break;
        }
        if (conditioned) {
          guarded += 1;
        } else if (/\.catch\s*\(/.test(top.getText(source))) {
          guarded += 1;
        } else {
          let stmt: ts.Node = n;
          while (stmt.parent && !ts.isStatement(stmt)) stmt = stmt.parent;
          const block = stmt.parent;
          if (receiver && block && "statements" in block) {
            const list = (block as ts.Block).statements;
            const i = list.indexOf(stmt as ts.Statement);
            // A status already decided before the parse is the order
            // this rule wants, so the parse only ever sees a 200 body.
            const decidedFirst = list.slice(0, i).some((st) => ownOkCheck(st, receiver, source));
            for (let k = i + 1; !decidedFirst && k < list.length; k += 1) {
              if (ownOkCheck(list[k], receiver, source)) {
                const { line } = source.getLineAndCharacterOfPosition(n.getStart(source));
                offenders.push(`${path.relative(root, file)}:${line + 1}`);
                break;
              }
            }
          }
        }
      }
      ts.forEachChild(n, visit);
    };
    ts.forEachChild(source, visit);
  }
  assert.ok(guarded > 20, `the rule is looking at real parses, found ${guarded} guarded`);
  assert.deepEqual(
    offenders.sort(),
    [],
    `these parse the body before checking the status, so a gateway 503 throws and the rule never runs. Add .catch(() => ({})): ${offenders.join(", ")}`,
  );
});

test("a corpus that was named and is not there is permanent", () => {
  // The two classes invert if this is wrong, which is the whole subject
  // of this file. Only the unnamed path checked that a corpus exists, so
  // a stale or mistyped RESEARCH_OS_EVIDENCE_DIR fell through to the
  // reader and came back as corpus_read_failed: a retryable answer to a
  // deployment fact, telling a person to retry what no retry fixes. The
  // peer's route-access suite caught it on a directory it creates and
  // never builds.
  /* eslint-disable-next-line @typescript-eslint/no-var-requires */
  const { loadCorpus, CorpusReadFailed, CorpusUnavailable } = require("../src/lib/research-os/evidence-search/server") as {
    loadCorpus: (env: Record<string, string | undefined>, root: string) => unknown;
    CorpusReadFailed: new (m: string) => Error;
    CorpusUnavailable: new (m: string) => Error;
  };
  const absent = path.join("/tmp", `no-corpus-${Date.now()}-${process.pid}`);

  for (const [what, env] of [
    ["a named directory that is not there", { RESEARCH_OS_EVIDENCE_DIR: absent }],
    ["nothing named and nothing built", {}],
  ] as [string, Record<string, string | undefined>][]) {
    let thrown: unknown;
    try {
      loadCorpus(env, absent);
    } catch (e) {
      thrown = e;
    }
    assert.ok(thrown instanceof CorpusUnavailable, `${what} raises CorpusUnavailable`);
    assert.ok(!(thrown instanceof CorpusReadFailed), `${what} is not a read that failed this minute`);
    assert.equal(isTransientOutage(503, "corpus_unavailable"), false, "and that code earns no retry");
  }
});

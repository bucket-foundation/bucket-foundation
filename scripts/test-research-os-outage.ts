import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import fs from "node:fs";
import path from "node:path";
import { OUTAGE_COPY, PERMANENT_CODES, PERMANENT_MESSAGE, TRANSIENT_CODES, UNCONFIGURED, UNCONFIGURED_COPY, isTransientOutage, readErrorCode } from "../src/lib/research-os/outage";
import { scan as scanRenderOrder } from "./research-os/render-order";

const root = path.join(__dirname, "..");
const CLIENTS = path.join(root, "src/app/research-os");

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
      for (const m of src.match(/\(\s*503\s*,\s*\{[^}]*error:\s*"[^"]+"/g) || []) {
        const err = m.match(/error:\s*"([^"]+)"/);
        if (err) codes.add(err[1]);
      }
      let at = src.indexOf("status: 503");
      while (at !== -1) {
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
  for (const code of ["busy", "node_read_failed"]) {
    assert.equal(isTransientOutage(503, code), true, `${code} passes`);
  }
  for (const code of ["access_unavailable", "loop_unavailable", "graph_read_failed", "consent_unavailable"]) {
    assert.equal(isTransientOutage(503, code), true, `${code} is unclassified, so it is offered a retry`);
  }
  assert.equal(isTransientOutage(503, UNCONFIGURED), false, "the one code that says the deployment has no graph");
  assert.equal(isTransientOutage(503, UNCONFIGURED), false, "the deployment has no graph behind it");
  assert.equal(isTransientOutage(500, "loop_unavailable"), false, "and it is a 503 rule");
  assert.equal(isTransientOutage(null, "loop_unavailable"), false);
});

test("a permanent misconfiguration is not offered a retry", () => {
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

const SILENT: { file: string; route: string; because: string; reportedBy: string; proof: RegExp }[] = [
  {
    file: "src/app/research-os/(app)/workspace/page.tsx",
    route: "assignments",
    because: "this read only decides whether to redirect to an open assignment, and a failure leaves the learner where they are. It renders nothing, so a second outage message here would be the same failure twice on one screen",
    reportedBy: "src/app/research-os/(app)/workspace/AssignmentsBanner.tsx",
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

function namedBinding(n: ts.Node): string | null {
  let up: ts.Node = n;
  while (up.parent && (ts.isCallExpression(up.parent) || ts.isParenthesizedExpression(up.parent) || ts.isAsExpression(up.parent))) {
    up = up.parent;
  }
  if (up.parent && ts.isVariableDeclaration(up.parent) && ts.isIdentifier(up.parent.name)) return up.parent.name.text;
  return null;
}

test("a helper bound through useCallback is still a helper", () => {
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
  const transientRoutes = routesEmittingTransient(path.join(root, "src/app/api/research-os"));
  assert.ok(transientRoutes.size > 0, "some route answers a transient 503, or this gate checks nothing");

  const offenders: string[] = [];
  for (const file of clientFiles([
    path.join(root, "src/app/research-os"),
    path.join(root, "src/components"),
    path.join(root, "src/lib/research-os"),
  ])) {
    const src = fs.readFileSync(file, "utf8");
    const source = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);

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
  assert.ok(failed instanceof CorpusUnavailable, "it is one");
  assert.equal(failed.name, "CorpusReadFailed", "and it says which one");
  assert.equal(isTransientOutage(503, "corpus_read_failed"), true, "a read that failed this minute earns a retry");
  assert.equal(isTransientOutage(503, "corpus_unavailable"), false, "a deployment with no corpus does not");
});

function ownOkCheck(s: ts.Statement, name: string, source: ts.SourceFile): boolean {
  return ts.isIfStatement(s) && new RegExp(`!\\s*${name}\\.ok\\b`).test(s.expression.getText(source));
}

test("nothing parses a body and then asks whether the request succeeded", () => {
  const offenders: string[] = [];
  let guarded = 0;
  for (const file of clientFiles([path.join(root, "src/app/research-os"), path.join(root, "src/components")])) {
    const src = fs.readFileSync(file, "utf8");
    if (!/\/api\/research-os\//.test(src)) continue;
    const source = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);
    const visit = (n: ts.Node): void => {
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === "json" && n.arguments.length === 0) {
        const receiver = ts.isIdentifier(n.expression.expression) ? n.expression.expression.text : null;
        let top: ts.Node = n;
        while (
          top.parent &&
          (ts.isPropertyAccessExpression(top.parent) || ts.isCallExpression(top.parent) || ts.isAwaitExpression(top.parent) || ts.isParenthesizedExpression(top.parent) || ts.isAsExpression(top.parent))
        ) {
          top = top.parent;
        }
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

test("a note a failed read sets is rendered above the return that can hide it", () => {
  const offenders: string[] = [];
  for (const f of tsxFiles(CLIENTS)) {
    for (const o of scanRenderOrder(f, fs.readFileSync(f, "utf8"))) {
      offenders.push(`${path.relative(root, o.file)}: ${o.note} ${o.because}${o.returnLine ? ` (return line ${o.returnLine}, render line ${o.noteLine})` : ""}`);
    }
  }
  assert.deepEqual(
    offenders.sort(),
    [],
    `these set an outage note that the person never reads. Render it above the return, or inside it: ${offenders.join("; ")}`,
  );
});

test("the render rule fires on the shape it was written for, and spares the three that look like it", () => {
  const bad = scanRenderOrder(
    "f.tsx",
    `export default function C() {
       const [rows, setRows] = useState<string[] | null>(null);
       const [note, setNote] = useState<string | null>(null);
       const load = async () => {
         const res = await fetch("/api/research-os/review");
         if (!res.ok) { setNote(OUTAGE_COPY.body); setRows([]); return; }
         setRows(["a"]);
       };
       if (rows === null) return <p>loading</p>;
       if (rows.length === 0) return <p>Nothing waits on you.</p>;
       return <div>{note}{rows}</div>;
     }`,
  );
  assert.equal(bad.length, 1, "the empty-state return above the note is the defect");
  assert.match(bad[0].because, /rows\.length === 0/);

  const fixed = scanRenderOrder(
    "f.tsx",
    `export default function C() {
       const [rows, setRows] = useState<string[] | null>(null);
       const [note, setNote] = useState<string | null>(null);
       const load = async () => {
         const res = await fetch("/api/research-os/review");
         if (!res.ok) { setNote(OUTAGE_COPY.body); setRows([]); return; }
         setRows(["a"]);
       };
       if (rows === null) return <p>loading</p>;
       if (note) return <p>{note}</p>;
       if (rows.length === 0) return <p>Nothing waits on you.</p>;
       return <div>{rows}</div>;
     }`,
  );
  assert.deepEqual(fixed, [], "a note rendered above the empty state is the repair");

  const opened = scanRenderOrder(
    "f.tsx",
    `export default function C() {
       const [open, setOpen] = useState(false);
       const [note, setNote] = useState<string | null>(null);
       const submit = async () => {
         const res = await fetch("/api/research-os/review", { method: "POST" });
         if (!res.ok) { setNote(OUTAGE_COPY.body); return; }
         setOpen(false);
       };
       if (!open) return <button onClick={() => setOpen(true)}>open</button>;
       return <div>{note}</div>;
     }`,
  );
  assert.deepEqual(opened, [], "a guard something else can turn off does not hide the note");

  const guard = scanRenderOrder(
    "f.tsx",
    `export default function C() {
       const [rows, setRows] = useState<string[] | null>(null);
       const [note, setNote] = useState<string | null>(null);
       const send = async (token: string | null) => {
         if (!token || rows === null) return;
         const res = await fetch("/api/research-os/review", { method: "POST" });
         if (!res.ok) { setNote(OUTAGE_COPY.body); setRows([]); return; }
       };
       return <div>{note}{rows}</div>;
     }`,
  );
  assert.deepEqual(guard, [], "a bare return in a handler is a precondition, not a screen");
});

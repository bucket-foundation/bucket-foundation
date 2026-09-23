/**
 * A note a failed read sets, and the return that can hide it.
 *
 * The outage rules in scripts/test-research-os-outage.ts prove a client
 * asks whether a 503 was retryable. None of them proves the answer
 * reaches a person. ReviewOnNode set its note, emptied both lists, and
 * returned on `holds.length === 0 && productions.length === 0` above
 * the line that renders the note, so every outage rendered "Nothing on
 * this node waits on you.": the sentence the guard exists to prevent,
 * behind a guarded call, under a green gate.
 *
 * A return is reported when three things hold together, because any one
 * of them alone reports code that is right:
 *
 *  - it is on the render path, returning JSX or null. A bare `return;`
 *    in an event handler renders nothing and hides nothing.
 *  - it is in the same function that renders the note.
 *  - its condition turns on state that only the note's own path fills.
 *    OverrideControl guards on `!open`, which the person has already
 *    made false by opening the panel before a submit can fail, so its
 *    error renders. AccessBlock guards on `!data`, which its read alone
 *    fills, so a failed read left it null and the panel vanished with
 *    the reason set.
 *
 * A loading guard is excluded the same way: it tests the state for the
 * value it starts at, and a failure path that assigns an empty list has
 * moved it off that value.
 */
import fs from "node:fs";
import path from "node:path";
import * as ts from "typescript";

export interface Offender { file: string; note: string; returnLine: number; noteLine: number; because: string }

function walk(n: ts.Node, f: (n: ts.Node) => void): void { f(n); ts.forEachChild(n, (c) => walk(c, f)); }

function enclosingFunction(n: ts.Node): ts.Node | null {
  for (let up: ts.Node | undefined = n.parent; up; up = up.parent) {
    if (ts.isFunctionDeclaration(up) || ts.isArrowFunction(up) || ts.isFunctionExpression(up)) return up;
  }
  return null;
}

/** setter -> state, from every `const [x, setX] = useState(...)`. */
function stateOf(source: ts.SourceFile): Map<string, string> {
  const out = new Map<string, string>();
  walk(source, (n) => {
    if (
      ts.isVariableDeclaration(n) && ts.isArrayBindingPattern(n.name) && n.name.elements.length === 2 &&
      n.initializer && ts.isCallExpression(n.initializer) && /useState/.test(n.initializer.expression.getText(source))
    ) {
      const [a, b] = n.name.elements;
      if (ts.isBindingElement(a) && ts.isIdentifier(a.name) && ts.isBindingElement(b) && ts.isIdentifier(b.name)) out.set(b.name.text, a.name.text);
    }
  });
  return out;
}

/** Every state this function assigns, and those it assigns an empty list. */
function assignedIn(fn: ts.Node, setters: ReadonlyMap<string, string>, source: ts.SourceFile): { touched: Set<string>; emptied: Set<string> } {
  const touched = new Set<string>();
  const emptied = new Set<string>();
  walk(fn, (n) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && setters.has(n.expression.text)) {
      const state = setters.get(n.expression.text)!;
      touched.add(state);
      if (n.arguments.length === 1 && ts.isArrayLiteralExpression(n.arguments[0]) && n.arguments[0].elements.length === 0) emptied.add(state);
    }
  });
  return { touched, emptied };
}

/** Whether every call to `state`'s setter sits inside `fn`. */
function onlySetIn(source: ts.SourceFile, setters: ReadonlyMap<string, string>, state: string, fn: ts.Node | null): boolean {
  if (!fn) return false;
  let outside = false;
  walk(source, (n) => {
    if (!ts.isCallExpression(n) || !ts.isIdentifier(n.expression)) return;
    if (setters.get(n.expression.text) !== state) return;
    let inside = false;
    for (let up: ts.Node | undefined = n; up; up = up.parent) if (up === fn) { inside = true; break; }
    if (!inside) outside = true;
  });
  return !outside;
}

/** The states named in this expression. */
function statesIn(n: ts.Node, known: ReadonlySet<string>): Set<string> {
  const out = new Set<string>();
  walk(n, (x) => { if (ts.isIdentifier(x) && known.has(x.text)) out.add(x.text); });
  return out;
}

function mentionsAny(n: ts.Node, names: ReadonlySet<string>, source: ts.SourceFile): boolean {
  let hit = false;
  walk(n, (x) => { if (ts.isIdentifier(x) && names.has(x.text)) hit = true; });
  return hit;
}

function referencedIn(n: ts.Node, name: string): boolean {
  let hit = false;
  walk(n, (x) => { if (ts.isIdentifier(x) && x.text === name) hit = true; });
  return hit;
}

export function scan(file: string, src: string): Offender[] {
  const source = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const setters = stateOf(source);
  if (setters.size === 0) return [];

  // Where an outage note is set, and what else that same path touches.
  const notes: { state: string; touched: Set<string>; emptied: Set<string>; fn: ts.Node }[] = [];
  walk(source, (n) => {
    if (
      ts.isCallExpression(n) && ts.isIdentifier(n.expression) && setters.has(n.expression.text) &&
      n.arguments.length === 1 && /OUTAGE_COPY\.body|UNCONFIGURED_COPY\.body/.test(n.arguments[0].getText(source))
    ) {
      const fn = enclosingFunction(n);
      if (fn) {
        const { touched, emptied } = assignedIn(fn, setters, source);
        notes.push({ state: setters.get(n.expression.text)!, touched, emptied, fn });
      }
    }
  });
  if (notes.length === 0) return [];

  // A return on the render path: `if (cond) return <jsx>` or
  // `return null`, which is what a person sees instead of the note.
  // A bare `return;` in an event handler is a precondition guard and
  // renders nothing, so it cannot stand between a note and a screen.
  const returns: ts.IfStatement[] = [];
  walk(source, (n) => {
    if (!ts.isIfStatement(n) || n.elseStatement) return;
    let ret: ts.ReturnStatement | null = null;
    const t = n.thenStatement;
    if (ts.isReturnStatement(t)) ret = t;
    else if (ts.isBlock(t) && t.statements.length > 0 && ts.isReturnStatement(t.statements[t.statements.length - 1])) ret = t.statements[t.statements.length - 1] as ts.ReturnStatement;
    if (!ret || !ret.expression) return;
    const text = ret.expression.getText(source);
    if (/<[a-zA-Z]/.test(text) || text.trim() === "null") returns.push(n);
  });

  const out: Offender[] = [];
  const seen = new Set<string>();
  for (const note of notes) {
    const noteFn = note.fn;
    // The first place a person reads the note.
    let noteAt = -1;
    let renderFn: ts.Node | null = null;
    walk(source, (x) => {
      if (noteAt !== -1 || !ts.isIdentifier(x) || x.text !== note.state) return;
      for (let up: ts.Node | undefined = x; up; up = up.parent) {
        if (ts.isJsxExpression(up) || ts.isJsxElement(up) || ts.isJsxFragment(up)) {
          noteAt = x.getStart(source);
          renderFn = enclosingFunction(x);
          return;
        }
      }
    });
    if (noteAt === -1) {
      const key = `${note.state}:norender`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ file, note: note.state, returnLine: 0, noteLine: 0, because: "is set and never rendered" });
      }
      continue;
    }
    for (const r of returns) {
      // Only a return the failure path can reach: its condition turns on
      // state the same path assigns.
      // The return has to stand between this note and the screen, so it
      // has to be on the same render path the note renders on.
      if (enclosingFunction(r) !== renderFn) continue;
      const others = new Set(Array.from(note.touched).filter((s) => s !== note.state));
      if (!mentionsAny(r.expression, others, source)) continue;
      // The guard has to turn on state only this path fills. When
      // something else can set it, the failure can arrive with the guard
      // already false: OverrideControl's `!open` is true until the
      // person opens the panel, and by the time a submit can fail they
      // have, so its error renders. AccessBlock's `!data` is filled by
      // the read alone, so a failed read leaves it null, the component
      // returns null, and the error it just set reaches nobody.
      const guards = Array.from(statesIn(r.expression, new Set(setters.values()))).filter((x) => note.touched.has(x));
      if (!guards.some((g) => onlySetIn(source, setters, g, noteFn))) continue;
      // A loading guard tests the state for its initial value. The
      // failure path assigns an empty list, which is not that value, so
      // this return cannot fire on it: ReviewOnNode's
      // `holds === null || productions === null` renders "Reading the
      // queue" before any read has answered, and load() sets both to []
      // on a failure. A condition that counts rows is the empty state
      // and does fire.
      const cond = r.expression.getText(source);
      const named = statesIn(r.expression, new Set(setters.values()));
      const allEmptied = Array.from(named).filter((s) => note.touched.has(s)).every((s) => note.emptied.has(s));
      if (!/\.length/.test(cond) && allEmptied && named.size > 0) continue;
      if (referencedIn(r, note.state)) continue;
      if (noteAt < r.getStart(source)) continue;
      const key = `${note.state}:${r.getStart(source)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        file,
        note: note.state,
        returnLine: source.getLineAndCharacterOfPosition(r.getStart(source)).line + 1,
        noteLine: source.getLineAndCharacterOfPosition(noteAt).line + 1,
        because: `returns on ${r.expression.getText(source).trim().slice(0, 60)} above the line that renders it`,
      });
    }
  }
  return out;
}

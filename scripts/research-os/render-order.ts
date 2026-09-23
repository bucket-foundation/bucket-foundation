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
      if (enclosingFunction(r) !== renderFn) continue;
      const others = new Set(Array.from(note.touched).filter((s) => s !== note.state));
      if (!mentionsAny(r.expression, others, source)) continue;
      const guards = Array.from(statesIn(r.expression, new Set(setters.values()))).filter((x) => note.touched.has(x));
      if (!guards.some((g) => onlySetIn(source, setters, g, noteFn))) continue;
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

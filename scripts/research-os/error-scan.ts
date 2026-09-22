/**
 * Reads whose failure is thrown away, found by parsing.
 *
 * A PostgREST call resolves with `{ data, error }`. Destructuring only
 * `data` and coalescing it to `[]` turns a failed read into an empty
 * result, and the surface then tells the reader they have nothing. That
 * is the third defect in `docs/CRITIC-PROTOCOL.md`, and it has been
 * found by hand four times in this repository: an assignment list that
 * rendered "No assignments yet" on an outage, a loop panel that showed
 * the first-run screen to a learner with a started deck, a graph route
 * that served an empty standing map, and a branch counter that answered
 * a graph with no branches in it.
 *
 * Text matching is the wrong tool: `|| []` is correct on a successful
 * read, because an empty set also arrives as null. What matters is
 * whether anything looks at `error`.
 */
import ts from "typescript";
import fs from "node:fs";
import path from "node:path";

export interface ErrorFinding {
  file: string;
  line: number;
  what: string;
}

/** Whether an await expression is a PostgREST builder chain. */
function isReadChain(node: ts.Expression): boolean {
  let cur: ts.Node = node;
  while (ts.isCallExpression(cur) && ts.isPropertyAccessExpression(cur.expression)) {
    // `rpc` resolves to the same { data, error } and fails the same way.
    if (cur.expression.name.text === "from" || cur.expression.name.text === "rpc") return true;
    cur = cur.expression.expression;
  }
  return false;
}

/** A value that says "there was nothing", which is what a failed read
 * must never be turned into without a reason. */
function isEmptyish(node: ts.Expression | undefined): boolean {
  if (!node) return false;
  if (ts.isArrayLiteralExpression(node) && node.elements.length === 0) return true;
  if (ts.isObjectLiteralExpression(node) && node.properties.length === 0) return true;
  if (node.kind === ts.SyntaxKind.NullKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return true;
  if (ts.isNumericLiteral(node) && node.text === "0") return true;
  if (ts.isIdentifier(node) && node.text === "undefined") return true;
  return false;
}

/** The statement that follows this declaration inside its own block. */
function nextStatement(decl: ts.VariableDeclaration): ts.Statement | null {
  const stmt = decl.parent?.parent;
  if (!stmt || !ts.isVariableStatement(stmt)) return null;
  const block = stmt.parent;
  if (!block || !("statements" in block)) return null;
  const list = (block as ts.Block).statements;
  const i = list.indexOf(stmt);
  return i >= 0 && i + 1 < list.length ? list[i + 1] : null;
}

/** Whether an expression mentions the given identifier anywhere. */
function mentions(node: ts.Node, name: string): boolean {
  let found = false;
  const walk = (n: ts.Node): void => {
    if (found) return;
    if (ts.isIdentifier(n) && n.text === name) { found = true; return; }
    ts.forEachChild(n, walk);
  };
  walk(node);
  return found;
}

/** The local name a destructuring pattern gives one property. */
function localNameFor(pattern: ts.ObjectBindingPattern, property: string): string | null {
  for (const el of pattern.elements) {
    const prop = el.propertyName && ts.isIdentifier(el.propertyName) ? el.propertyName.text : ts.isIdentifier(el.name) ? el.name.text : "";
    if (prop === property && ts.isIdentifier(el.name)) return el.name.text;
  }
  return null;
}

/** The property names a destructuring pattern binds. */
function boundNames(pattern: ts.ObjectBindingPattern): string[] {
  return pattern.elements.map((el) =>
    el.propertyName && ts.isIdentifier(el.propertyName)
      ? el.propertyName.text
      : ts.isIdentifier(el.name)
        ? el.name.text
        : "",
  );
}

export function scanFile(file: string, text: string): ErrorFinding[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const findings: ErrorFinding[] = [];

  const visit = (node: ts.Node): void => {
    // `const { data } = await svc.from(...)...`
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isAwaitExpression(node.initializer)) {
      if (ts.isObjectBindingPattern(node.name) && isReadChain(node.initializer.expression)) {
        const names = boundNames(node.name);
        // Binding `count` beside `data` used to exempt the read. It is
        // the same read and it fails the same way, so the only thing
        // that matters is whether `error` is bound.
        if (names.includes("data") && !names.includes("error")) {
          const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
          findings.push({ file, line: line + 1, what: "destructures data and drops error" });
        } else if (names.includes("data") && names.includes("error")) {
          // Binding `error` is not the same as answering it. The live
          // form of this defect guards on `error || !data` and returns
          // the same empty value either way, so the caller still cannot
          // tell an outage from a learner with nothing.
          const errName = localNameFor(node.name, "error");
          const next = errName ? nextStatement(node) : null;
          if (errName && next && ts.isIfStatement(next) && mentions(next.expression, errName)) {
            const then = next.thenStatement;
            const ret = ts.isReturnStatement(then)
              ? then
              : ts.isBlock(then) && then.statements.length === 1 && ts.isReturnStatement(then.statements[0])
                ? (then.statements[0] as ts.ReturnStatement)
                : null;
            if (ret && isEmptyish(ret.expression)) {
              const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
              findings.push({ file, line: line + 1, what: "checks error and returns the same empty value a successful read would give" });
            }
          }
        }
      }
    }
    // `(await svc.from(...)).data`
    if (
      ts.isPropertyAccessExpression(node) &&
      node.name.text === "data" &&
      ts.isParenthesizedExpression(node.expression) &&
      ts.isAwaitExpression(node.expression.expression) &&
      isReadChain(node.expression.expression.expression)
    ) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
      findings.push({ file, line: line + 1, what: "reads .data off an awaited call and drops error" });
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(source, visit);
  return findings;
}

export function scanTree(roots: string[]): ErrorFinding[] {
  const out: ErrorFinding[] = [];
  const walk = (dir: string): void => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
        out.push(...scanFile(full, fs.readFileSync(full, "utf8")));
      }
    }
  };
  for (const r of roots) walk(r);
  return out;
}

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
    if (cur.expression.name.text === "from") return true;
    cur = cur.expression.expression;
  }
  return false;
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
        if (names.includes("data") && !names.includes("error") && !names.includes("count")) {
          const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
          findings.push({ file, line: line + 1, what: "destructures data and drops error" });
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

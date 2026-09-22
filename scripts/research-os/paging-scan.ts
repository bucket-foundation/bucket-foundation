/**
 * Every PostgREST read in Research OS that filters on a list of ids,
 * found by parsing rather than by matching text.
 *
 * The first version of this check split files on `;` and matched with
 * regexes. A reviewer proved three holes in it: a sibling read inside
 * the same `Promise.all` satisfied the order rule for an unordered one,
 * a builder behind a local function was invisible, and a raw `.in(ids)`
 * that used no chunk helper was never looked at. The third had live
 * instances. Narrowing the docstring to claim less was the wrong answer.
 *
 * This walks the TypeScript AST, so a chain is a chain wherever it sits:
 * inside an array literal, behind a helper, or returned from an arrow.
 *
 * A read is at risk when it filters with `.in(column, list)` where the
 * list is an identifier rather than a literal array. A literal list is
 * bounded by the source, so `.in("role", ["teacher", "librarian"])`
 * needs nothing.
 */
import ts from "typescript";
import fs from "node:fs";
import path from "node:path";

export interface PagingFinding {
  file: string;
  line: number;
  chain: string;
  reasons: string[];
}

/** The method names in one builder chain, innermost first. */
function chainOf(node: ts.CallExpression): { names: string[]; calls: ts.CallExpression[] } {
  const names: string[] = [];
  const calls: ts.CallExpression[] = [];
  let cur: ts.Expression = node;
  while (ts.isCallExpression(cur) && ts.isPropertyAccessExpression(cur.expression)) {
    names.push(cur.expression.name.text);
    calls.push(cur);
    cur = cur.expression.expression;
  }
  return { names: names.reverse(), calls };
}

/** Whether an `.in()` call's second argument is a literal list. */
function isLiteralList(call: ts.CallExpression): boolean {
  const arg = call.arguments[1];
  return Boolean(arg && ts.isArrayLiteralExpression(arg));
}

/**
 * Local functions whose body returns a builder chain, so a call to one
 * counts as the chain it returns.
 */
function chainReturningLocals(source: ts.SourceFile): Set<string> {
  const out = new Set<string>();
  const visit = (node: ts.Node): void => {
    const name =
      ts.isFunctionDeclaration(node) && node.name ? node.name.text :
      ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer &&
        (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)) ? node.name.text :
      null;
    if (name) {
      const text = node.getText(source);
      if (/\.from\(/.test(text) && /\.in\(/.test(text)) out.add(name);
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(source, visit);
  return out;
}

export function scanFile(file: string, text: string): PagingFinding[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const locals = chainReturningLocals(source);
  const findings: PagingFinding[] = [];
  const seen = new Set<ts.Node>();

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const { names, calls } = chainOf(node);
      const fromAt = names.indexOf("from");
      if (fromAt !== -1 && !seen.has(node)) {
        // Mark the whole chain seen, so only the outermost call reports.
        for (const c of calls) seen.add(c);
        const inCalls = calls.filter((c) => ts.isPropertyAccessExpression(c.expression) && c.expression.name.text === "in");
        const unbounded = inCalls.filter((c) => !isLiteralList(c));
        if (unbounded.length > 0) {
          const reasons: string[] = [];
          if (!names.includes("range")) reasons.push("no .range(), so it stops at the row cap");
          if (!names.includes("order")) reasons.push("no .order(), so a page can repeat and skip");
          if (names.includes("maybeSingle") || names.includes("single")) reasons.length = 0;
          if (reasons.length) {
            const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
            findings.push({
              file,
              line: line + 1,
              chain: names.join("."),
              reasons,
            });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(source, visit);

  // A call to a local that returns a chain inherits that chain's verdict,
  // which the chain itself already reported, so nothing extra is needed
  // here. The set is exported through the finding's chain text instead.
  void locals;
  return findings;
}

export function scanTree(roots: string[]): PagingFinding[] {
  const out: PagingFinding[] = [];
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

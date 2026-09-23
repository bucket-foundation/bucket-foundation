import ts from "typescript";
import fs from "node:fs";
import path from "node:path";

export interface PagingFinding {
  file: string;
  line: number;
  chain: string;
  reasons: string[];
  anchor: string;
}

function enclosingName(node: ts.Node): string {
  let cur: ts.Node | undefined = node;
  while (cur) {
    if ((ts.isFunctionDeclaration(cur) || ts.isMethodDeclaration(cur)) && cur.name) return cur.name.getText();
    if ((ts.isArrowFunction(cur) || ts.isFunctionExpression(cur)) && cur.parent && ts.isVariableDeclaration(cur.parent) && ts.isIdentifier(cur.parent.name)) {
      return cur.parent.name.text;
    }
    cur = cur.parent;
  }
  return "<module>";
}

function tableOf(node: ts.Node, source: ts.SourceFile): string {
  const m = node.getText(source).match(/\.(?:from|rpc)\(\s*["'`]([^"'`]+)["'`]/);
  return m ? m[1] : "<unknown>";
}

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

function isLiteralList(call: ts.CallExpression): boolean {
  const arg = call.arguments[1];
  return Boolean(arg && ts.isArrayLiteralExpression(arg));
}

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
  const seenAnchors = new Map<string, number>();
  const anchorFor = (node: ts.Node): string => {
    const rel = file.replace(/^.*?\/(src|scripts)\//, "$1/");
    const base = `${rel}::${enclosingName(node)}::${tableOf(node, source)}`;
    const n = (seenAnchors.get(base) ?? 0) + 1;
    seenAnchors.set(base, n);
    return `${base}::${n}`;
  };
  const locals = chainReturningLocals(source);
  const findings: PagingFinding[] = [];
  const seen = new Set<ts.Node>();

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const { names, calls } = chainOf(node);
      const fromAt = names.indexOf("from");
      if (fromAt !== -1 && !seen.has(node)) {
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
              anchor: anchorFor(node),
            });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(source, visit);

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

import ts from "typescript";
import fs from "node:fs";
import path from "node:path";

export interface ErrorFinding {
  file: string;
  line: number;
  what: string;
  anchor: string;
}

function isReadChain(node: ts.Expression): boolean {
  let cur: ts.Node = node;
  while (ts.isCallExpression(cur) && ts.isPropertyAccessExpression(cur.expression)) {
    if (cur.expression.name.text === "from" || cur.expression.name.text === "rpc") return true;
    cur = cur.expression.expression;
  }
  return false;
}

function isEmptyish(node: ts.Expression | undefined): boolean {
  if (!node) return false;
  if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) return isEmptyish(node.expression);
  if (ts.isParenthesizedExpression(node)) return isEmptyish(node.expression);
  if (ts.isSatisfiesExpression?.(node)) return isEmptyish((node as ts.SatisfiesExpression).expression);
  if (ts.isArrayLiteralExpression(node) && node.elements.length === 0) return true;
  if (ts.isObjectLiteralExpression(node) && node.properties.length === 0) return true;
  if (node.kind === ts.SyntaxKind.NullKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return true;
  if (ts.isNumericLiteral(node) && node.text === "0") return true;
  if (ts.isIdentifier(node) && node.text === "undefined") return true;
  return false;
}

function firstStatementMentioning(decl: ts.VariableDeclaration, name: string): ts.Statement | null {
  const stmt = decl.parent?.parent;
  if (!stmt || !ts.isVariableStatement(stmt)) return null;
  const block = stmt.parent;
  if (!block || !("statements" in block)) return null;
  const list = (block as ts.Block).statements;
  const i = list.indexOf(stmt);
  if (i < 0) return null;
  for (let k = i + 1; k < list.length; k += 1) {
    if (mentions(list[k], name)) return list[k];
  }
  return null;
}

function enclosingFunction(node: ts.Node): ts.Node | null {
  let cur: ts.Node | undefined = node;
  while (cur) {
    if (ts.isFunctionDeclaration(cur) || ts.isMethodDeclaration(cur) || ts.isArrowFunction(cur) || ts.isFunctionExpression(cur)) return cur;
    cur = cur.parent;
  }
  return null;
}

function isRefusal(e: ts.ObjectLiteralExpression): boolean {
  return e.properties.some(
    (prop) =>
      ts.isPropertyAssignment(prop) &&
      ts.isIdentifier(prop.name) &&
      prop.name.text === "ok" &&
      prop.initializer.kind === ts.SyntaxKind.FalseKeyword,
  );
}

function returnsEmptyish(ret: ts.ReturnStatement): boolean {
  const e = ret.expression;
  if (!e) return false;
  if (ts.isObjectLiteralExpression(e) && isRefusal(e)) return false;
  if (isEmptyish(e)) return true;
  if (ts.isObjectLiteralExpression(e) && e.properties.length > 0) {
    return e.properties.every((prop) => ts.isPropertyAssignment(prop) && isEmptyish(prop.initializer as ts.Expression));
  }
  return false;
}

function branchHidesTheFailure(
  ret: ts.ReturnStatement,
  condition: ts.Expression,
  thenStatement: ts.Statement,
  errName: string,
  dataName: string | undefined,
): boolean {
  const e = ret.expression;
  if (!e) return false;
  if (e.kind === ts.SyntaxKind.NullKeyword) {
    const readsError = mentions(thenStatement, errName);
    const alsoTestsData = dataName ? mentions(condition, dataName) : false;
    return !readsError || alsoTestsData;
  }
  return isEmptyish(e) || allEmptyObject(e);
}

function soleReturn(then: ts.Statement): ts.ReturnStatement | null {
  if (ts.isReturnStatement(then)) return then;
  if (ts.isBlock(then) && then.statements.length > 0) {
    const last = then.statements[then.statements.length - 1];
    if (ts.isReturnStatement(last)) return last;
  }
  return null;
}

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

function localNameFor(pattern: ts.ObjectBindingPattern, property: string): string | null {
  for (const el of pattern.elements) {
    const prop = el.propertyName && ts.isIdentifier(el.propertyName) ? el.propertyName.text : ts.isIdentifier(el.name) ? el.name.text : "";
    if (prop === property && ts.isIdentifier(el.name)) return el.name.text;
  }
  return null;
}

function boundNames(pattern: ts.ObjectBindingPattern): string[] {
  return pattern.elements.map((el) =>
    el.propertyName && ts.isIdentifier(el.propertyName)
      ? el.propertyName.text
      : ts.isIdentifier(el.name)
        ? el.name.text
        : "",
  );
}

function isPromiseAllOfReads(node: ts.Expression): boolean {
  if (!ts.isCallExpression(node)) return false;
  const callee = node.expression;
  if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "all") return false;
  if (!ts.isIdentifier(callee.expression) || callee.expression.text !== "Promise") return false;
  const list = node.arguments[0];
  if (!list || !ts.isArrayLiteralExpression(list)) return false;
  return list.elements.some((e) => isReadChain(e as ts.Expression));
}

const READ_HELPERS = /(?:svc|client|supabase|graphService\(\))\s*\.(?:from|rpc)\(|inChunks\(|pagedRead\(|loadSubgraph\(|loadConnections\(/;
function looksLikeRead(text: string): boolean {
  return READ_HELPERS.test(text);
}

function checkedThroughLoop(fn: ts.Node, held: string, source: ts.SourceFile): boolean {
  let checked = false;
  const walk = (n: ts.Node): void => {
    if (checked) return;
    if (ts.isForOfStatement(n) && ts.isArrayLiteralExpression(n.expression)) {
      const names = n.expression.elements.map((e) => (ts.isIdentifier(e) ? e.text : ""));
      if (names.includes(held)) {
        const decl = n.initializer;
        const loopVar =
          ts.isVariableDeclarationList(decl) && decl.declarations.length === 1 && ts.isIdentifier(decl.declarations[0].name)
            ? decl.declarations[0].name.text
            : null;
        if (loopVar && new RegExp(`\\b${loopVar}\\.error\\b`).test(n.statement.getText(source))) checked = true;
      }
    }
    ts.forEachChild(n, walk);
  };
  walk(fn);
  return checked;
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
  const text = node.getText(source);
  const m = text.match(/\.(?:from|rpc)\(\s*["'`]([^"'`]+)["'`]/);
  return m ? m[1] : "<unknown>";
}

function allEmptyObject(node: ts.Expression): boolean {
  const e = ts.isParenthesizedExpression(node) ? node.expression : node;
  if (!ts.isObjectLiteralExpression(e) || e.properties.length === 0) return false;
  if (isRefusal(e)) return false;
  return e.properties.every((prop) => ts.isPropertyAssignment(prop) && isEmptyish(prop.initializer as ts.Expression));
}

function mentionsOutside(scope: ts.Node, name: string, exclude: ts.Node): boolean {
  let found = false;
  const lo = exclude.getStart();
  const hi = exclude.getEnd();
  const walk = (n: ts.Node): void => {
    if (found) return;
    if (ts.isIdentifier(n) && n.text === name && (n.getStart() < lo || n.getStart() >= hi)) { found = true; return; }
    ts.forEachChild(n, walk);
  };
  walk(scope);
  return found;
}

export function scanFile(file: string, text: string): ErrorFinding[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const findings: ErrorFinding[] = [];
  const seen = new Map<string, number>();
  const anchorFor = (node: ts.Node, chain: ts.Node, bound?: string): string => {
    const rel = file.replace(/^.*?\/(src|scripts)\//, "$1/");
    const base = `${rel}::${enclosingName(node)}::${tableOf(chain, source)}${bound ? `::${bound}` : ""}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return `${base}::${n}`;
  };

  const visit = (node: ts.Node): void => {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isArrayLiteralExpression(node.left) &&
      ts.isAwaitExpression(node.right) &&
      isPromiseAllOfReads(node.right.expression)
    ) {
      const list = (node.right.expression as ts.CallExpression).arguments[0];
      const elements = ts.isArrayLiteralExpression(list) ? list.elements : undefined;
      node.left.elements.forEach((target, i) => {
        if (!ts.isIdentifier(target)) return;
        const held = target.text;
        const fn = enclosingFunction(node);
        if (!fn) return;
        const text = fn.getText(source);
        const readsData = new RegExp(`\\b${held}\\b[^;]{0,160}\\.(data|count)\\b`).test(text);
        const readsError = new RegExp(`\\b${held}\\.error\\b`).test(text);
        if (readsData && !readsError && !checkedThroughLoop(fn, held, source)) {
          const { line } = source.getLineAndCharacterOfPosition(target.getStart(source));
          findings.push({
            file,
            line: line + 1,
            what: "assigns a Promise.all element and reads data off it without ever reading error",
            anchor: anchorFor(node, elements?.[i] ?? node, held),
          });
        }
      });
    }
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isAwaitExpression(node.initializer)) {
      if (ts.isObjectBindingPattern(node.name) && isReadChain(node.initializer.expression)) {
        const names = boundNames(node.name);
        if (names.includes("data") && !names.includes("error")) {
          const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
          findings.push({ file, line: line + 1, what: "destructures data and drops error", anchor: anchorFor(node, node, localNameFor(node.name, "data") ?? undefined) });
        } else if (names.includes("data") && names.includes("error")) {
          const errName = localNameFor(node.name, "error");
          const next = errName ? firstStatementMentioning(node, errName) : null;
          if (errName && next && ts.isIfStatement(next) && mentions(next.expression, errName)) {
            const ret = soleReturn(next.thenStatement);
            if (ret && branchHidesTheFailure(ret, next.expression, next.thenStatement, errName, localNameFor(node.name, "data") ?? undefined)) {
              const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
              findings.push({ file, line: line + 1, what: "checks error and returns the same empty value a successful read would give", anchor: anchorFor(node, node, localNameFor(node.name, "data") ?? undefined) });
            }
          } else if (errName && !next) {
            const fn = enclosingFunction(node);
            if (fn && !mentionsOutside(fn, errName, node.name)) {
              const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
              findings.push({ file, line: line + 1, what: "binds error and never reads it", anchor: anchorFor(node, node, localNameFor(node.name, "data") ?? undefined) });
            }
          }
        }
      }
    }
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isAwaitExpression(node.initializer)) {
      if (ts.isArrayBindingPattern(node.name) && isPromiseAllOfReads(node.initializer.expression)) {
        for (const el of node.name.elements) {
          if (!ts.isBindingElement(el)) continue;
          if (ts.isObjectBindingPattern(el.name)) {
            const names = boundNames(el.name);
            if (names.includes("data") && !names.includes("error")) {
              const { line } = source.getLineAndCharacterOfPosition(el.getStart(source));
              const list = (node.initializer.expression as ts.CallExpression).arguments[0];
              const own = ts.isArrayLiteralExpression(list) ? list.elements[node.name.elements.indexOf(el)] : undefined;
              findings.push({
                file,
                line: line + 1,
                what: "destructures data out of a Promise.all element and drops error",
                anchor: anchorFor(node, own ?? node, localNameFor(el.name as ts.ObjectBindingPattern, "data") ?? undefined),
              });
            }
            continue;
          }
          if (ts.isIdentifier(el.name)) {
            const held = el.name.text;
            const fn = enclosingFunction(node);
            if (!fn) continue;
            const text = fn.getText(source);
            const readsData = new RegExp(`\\b${held}\\b[^;]{0,160}\\.(data|count)\\b`).test(text);
            const readsError = new RegExp(`\\b${held}\\.error\\b`).test(text);
            if (readsData && !readsError && !checkedThroughLoop(fn, held, source)) {
              const { line } = source.getLineAndCharacterOfPosition(el.getStart(source));
              const list = (node.initializer.expression as ts.CallExpression).arguments[0];
              const own = ts.isArrayLiteralExpression(list) ? list.elements[node.name.elements.indexOf(el)] : undefined;
              findings.push({
                file,
                line: line + 1,
                what: "holds a Promise.all element and reads data off it without ever reading error",
                anchor: anchorFor(node, own ?? node, held),
              });
            }
          }
        }
      }
    }

    if (ts.isVariableDeclaration(node) && node.initializer && ts.isAwaitExpression(node.initializer)) {
      if (ts.isIdentifier(node.name) && isReadChain(node.initializer.expression)) {
        const held = node.name.text;
        const fn = enclosingFunction(node);
        if (fn && mentions(fn, held)) {
          const text = fn.getText(source);
          const readsData = new RegExp(`\\b${held}\\.data\\b`).test(text) || new RegExp(`\\b${held}\\.count\\b`).test(text);
          const readsError = new RegExp(`\\b${held}\\.error\\b`).test(text);
          if (readsData && !readsError && !checkedThroughLoop(fn, held, source)) {
            const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
            findings.push({ file, line: line + 1, what: "holds the result and reads data off it without ever reading error", anchor: anchorFor(node, node, held) });
          }
        }
      }
    }

    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "catch" &&
      node.arguments.length === 1
    ) {
      const arg = node.arguments[0];
      const body = ts.isArrowFunction(arg) ? arg.body : null;
      let returned: ts.Expression | undefined;
      if (body && !ts.isBlock(body)) returned = body as ts.Expression;
      else if (body && ts.isBlock(body) && body.statements.length === 1 && ts.isReturnStatement(body.statements[0])) {
        returned = (body.statements[0] as ts.ReturnStatement).expression;
      }
      const empty = returned ? isEmptyish(returned) || allEmptyObject(returned) : false;
      if (empty && looksLikeRead(node.expression.expression.getText(source))) {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
        findings.push({ file, line: line + 1, what: "catches a failed read and returns the same empty value a successful one would give", anchor: anchorFor(node, node) });
      }
    }

    if (
      ts.isPropertyAccessExpression(node) &&
      node.name.text === "data" &&
      ts.isParenthesizedExpression(node.expression) &&
      ts.isAwaitExpression(node.expression.expression) &&
      isReadChain(node.expression.expression.expression)
    ) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
      findings.push({ file, line: line + 1, what: "reads .data off an awaited call and drops error", anchor: anchorFor(node, node) });
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

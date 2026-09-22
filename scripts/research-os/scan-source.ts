/**
 * Reading TypeScript sources structurally, for the gates under
 * `scripts/` that police a rule across a whole directory.
 *
 * A gate that greps raw source credits a comment. `// we call
 * authorizeNode() here one day` satisfies a regex for
 * `authorizeNode\(` and the route passes with nobody authorized. So
 * every helper here works on code alone: `stripComments` blanks
 * comments and string bodies, and the AST helpers see neither.
 */
import fs from "node:fs";
import path from "node:path";
import * as ts from "typescript";

/**
 * Comments blanked, newlines kept, so a reported line number still
 * points at the right line.
 *
 * String bodies go by default: `.range(` inside an error message is not
 * a read, and a table name inside a log line is not a query. A rule
 * that has to read which table or column a call names passes
 * `keepStrings`, and pays for it by matching only inside a call it has
 * already identified.
 */
export function stripComments(src: string, options: { keepStrings?: boolean } = {}): string {
  const keep = options.keepStrings === true;
  let out = "";
  let i = 0;
  let mode: "code" | "line" | "block" | "single" | "double" | "tick" = "code";
  while (i < src.length) {
    const two = src.slice(i, i + 2);
    if (mode === "code") {
      if (two === "//") { mode = "line"; out += "  "; i += 2; continue; }
      if (two === "/*") { mode = "block"; out += "  "; i += 2; continue; }
      if (src[i] === "'") mode = "single";
      else if (src[i] === '"') mode = "double";
      else if (src[i] === "`") mode = "tick";
      out += src[i]; i += 1; continue;
    }
    if (mode === "line") {
      if (src[i] === "\n") { mode = "code"; out += "\n"; } else out += " ";
      i += 1; continue;
    }
    if (mode === "block") {
      if (two === "*/") { mode = "code"; out += "  "; i += 2; continue; }
      out += src[i] === "\n" ? "\n" : " "; i += 1; continue;
    }
    if (src[i] === "\\") { out += keep ? src.slice(i, i + 2) : "  "; i += 2; continue; }
    if ((mode === "single" && src[i] === "'") || (mode === "double" && src[i] === '"') || (mode === "tick" && src[i] === "`")) {
      mode = "code";
      out += src[i]; i += 1; continue;
    }
    out += keep || src[i] === "\n" ? src[i] : " ";
    i += 1;
  }
  return out;
}

/** Every `.ts`/`.tsx` under `dir`, recursively. Absent directory reads as empty. */
export function tsFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...tsFiles(full));
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

export function parse(text: string, name = "x.ts"): ts.SourceFile {
  return ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);
}

/** Every node in the tree, parents included. */
export function walk(node: ts.Node, visit: (n: ts.Node) => void): void {
  visit(node);
  ts.forEachChild(node, (c) => walk(c, visit));
}

/**
 * The names called under `node`, as plain calls and as one-level
 * property calls.
 *
 * `dbAccessStore.nodes(ids)` reads node rows and is not a bare
 * identifier call, so a rule matching identifiers alone never saw it.
 * A property call is recorded under its qualified name and under the
 * method name, so a reader set can name either.
 */
export function calleeNames(node: ts.Node): Set<string> {
  const out = new Set<string>();
  walk(node, (n) => {
    if (!ts.isCallExpression(n)) return;
    if (ts.isIdentifier(n.expression)) { out.add(n.expression.text); return; }
    if (ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.expression)) {
      out.add(`${n.expression.expression.text}.${n.expression.name.text}`);
    }
  });
  return out;
}

/**
 * Local name to imported name, for every import in the file.
 *
 * `import { loadSubgraph as graphOf }` then `graphOf(branch)` reads the
 * graph under a name no reader set holds, so an alias has to resolve
 * before a call is matched.
 */
export function importAliases(sf: ts.SourceFile): Map<string, string> {
  const out = new Map<string, string>();
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !st.importClause) continue;
    const named = st.importClause.namedBindings;
    if (named && ts.isNamedImports(named)) {
      for (const el of named.elements) {
        out.set(el.name.text, el.propertyName ? el.propertyName.text : el.name.text);
      }
    }
    if (st.importClause.name) out.set(st.importClause.name.text, st.importClause.name.text);
  }
  return out;
}

/** Whether any of `names` is called as a plain function under `node`. */
export function callsAny(node: ts.Node, names: readonly string[]): boolean {
  const called = calleeNames(node);
  return names.some((n) => called.has(n));
}

/**
 * Whether the code reads row content from one of `tables` through a
 * PostgREST builder.
 *
 * A write touches the same table and exposes nothing. A head count
 * yields a number. Both are excluded: the question is whether a field
 * of a row can reach the caller.
 */
export function readsContentFrom(root: ts.Node, sf: ts.SourceFile, tables: readonly string[]): boolean {
  let found = false;
  walk(root, (n) => {
    if (found) return;
    if (!ts.isCallExpression(n) || !ts.isPropertyAccessExpression(n.expression)) return;
    if (n.expression.name.text !== "from") return;
    const arg = n.arguments[0];
    if (!arg) return;
    // A template with no substitution is the same string.
    const name = ts.isStringLiteral(arg)
      ? arg.text
      : ts.isNoSubstitutionTemplateLiteral(arg)
        ? arg.text
        : null;
    if (name === null || !tables.includes(name)) return;
    // Climb to the root of the builder chain, so `.select()` and
    // `.update()` further along are both in view.
    let top: ts.Node = n;
    while (top.parent && (ts.isPropertyAccessExpression(top.parent) || ts.isCallExpression(top.parent))) top = top.parent;
    const chain = top.getText(sf);
    if (/\.(update|insert|upsert|delete)\s*\(/.test(chain)) return;
    if (/head:\s*true/.test(chain)) return;
    // A chain the walk cannot resolve to a write or a head count counts
    // as a read. `const q = svc.from("nodes"); await q.select(...)`
    // splits the builder across statements, so the `.select(` is not in
    // this text and the read was invisible. Guessing toward a read is
    // the safe direction for a gate about what reaches a browser.
    found = true;
  });
  return found;
}

export interface FnDef {
  name: string;
  file: string;
  body: ts.Node;
  sf: ts.SourceFile;
}

/** Every named function in `file`, whether declared, assigned or exported. */
export function functionsIn(file: string): FnDef[] {
  const sf = parse(fs.readFileSync(file, "utf8"), file);
  const out: FnDef[] = [];
  walk(sf, (node) => {
    if (ts.isFunctionDeclaration(node) && node.name && node.body) {
      out.push({ name: node.name.text, file, body: node.body, sf });
      return;
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const init = node.initializer;
      if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
        out.push({ name: node.name.text, file, body: init.body, sf });
        return;
      }
      // An object literal's methods, under `<object>.<method>`.
      // dbAccessStore is written this way and reads node rows, and a
      // rule that saw only declarations and arrows never held it.
      if (ts.isObjectLiteralExpression(init)) {
        const owner = node.name.text;
        for (const prop of init.properties) {
          const mname = prop.name && ts.isIdentifier(prop.name) ? prop.name.text : null;
          if (!mname) continue;
          if (ts.isMethodDeclaration(prop) && prop.body) {
            out.push({ name: `${owner}.${mname}`, file, body: prop.body, sf });
          } else if (ts.isPropertyAssignment(prop) && (ts.isArrowFunction(prop.initializer) || ts.isFunctionExpression(prop.initializer))) {
            out.push({ name: `${owner}.${mname}`, file, body: prop.initializer.body, sf });
          }
        }
      }
    }
  });
  return out;
}

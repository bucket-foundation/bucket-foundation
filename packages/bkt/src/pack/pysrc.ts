import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

export interface PySource {
  version: string;
  files: Record<string, string>;
}

function walk(dir: string): string[] {
  return readdirSync(dir)
    .sort()
    .flatMap((name) => {
      const p = join(dir, name);
      if (name === "__pycache__") return [];
      return statSync(p).isDirectory() ? walk(p) : p.endsWith(".py") || p.endsWith(".html") ? [p] : [];
    });
}

export function buildPySource(pkgDir: string, repoDir: string): PySource {
  const files: Record<string, string> = { "bkt_analyze.py": readFileSync(join(pkgDir, "analyze/bkt_analyze.py"), "utf8") };
  const helixRoot = join(repoDir, "tools/helix");
  for (const p of walk(join(helixRoot, "helix"))) files[`helix/${relative(helixRoot, p)}`] = readFileSync(p, "utf8");
  const primeRoot = join(repoDir, "tools/prime-directions");
  for (const p of walk(join(primeRoot, "prime_directions"))) files[relative(primeRoot, p)] = readFileSync(p, "utf8");
  files["corpora.json"] = readFileSync(join(primeRoot, "corpora.json"), "utf8");
  const h = createHash("sha256");
  for (const k of Object.keys(files).sort()) h.update(k).update("\0").update(files[k]).update("\0");
  return { version: h.digest("hex").slice(0, 16), files };
}

if (import.meta.main) {
  const pkg = resolve(import.meta.dir, "../..");
  const src = buildPySource(pkg, resolve(pkg, "../.."));
  mkdirSync(join(pkg, "content"), { recursive: true });
  writeFileSync(join(pkg, "content/pysrc.json"), JSON.stringify(src));
  console.log(`pysrc ${src.version}: ${Object.keys(src.files).length} files`);
}

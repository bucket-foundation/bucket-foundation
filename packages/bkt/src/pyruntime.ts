import { chmodSync, existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { PySource } from "./pack/pysrc";

export function cacheRoot(env = process.env): string {
  return join(env.XDG_CACHE_HOME ?? join(homedir(), ".cache"), "bkt/py");
}

export function extractPy(src: PySource, root = cacheRoot()): string {
  const dest = join(root, src.version);
  if (existsSync(join(dest, ".complete"))) return dest;
  mkdirSync(root, { recursive: true, mode: 0o700 });
  chmodSync(root, 0o700);
  const tmp = `${dest}.tmp-${process.pid}`;
  rmSync(tmp, { recursive: true, force: true });
  for (const [rel, body] of Object.entries(src.files)) {
    const p = join(tmp, rel);
    mkdirSync(dirname(p), { recursive: true, mode: 0o700 });
    writeFileSync(p, body, { mode: 0o600 });
  }
  writeFileSync(join(tmp, ".complete"), src.version, { mode: 0o600 });
  chmodSync(tmp, 0o700);
  try {
    renameSync(tmp, dest);
  } catch (e) {
    rmSync(tmp, { recursive: true, force: true });
    if (!existsSync(join(dest, ".complete"))) throw e;
  }
  return dest;
}

export interface PyPaths {
  script: string;
  helixDir?: string;
}

export function pyPaths(src: PySource, dev: boolean, env = process.env): PyPaths {
  if (dev && env.BKT_ANALYZE_PY) return { script: env.BKT_ANALYZE_PY, helixDir: env.BKT_HELIX_DIR };
  const dir = extractPy(src, cacheRoot(env));
  return { script: join(dir, "bkt_analyze.py"), helixDir: join(dir, "helix") };
}

export function checkPython(python: string): string | null {
  let code: number | null;
  try {
    code = Bun.spawnSync([python, "-c", "import numpy"], { stdout: "ignore", stderr: "ignore" }).exitCode;
  } catch {
    code = null;
  }
  if (code === 0) return null;
  if (code === null) return `${python} not found; install Python 3 and then ${python} -m pip install --user numpy`;
  return `numpy is missing for ${python}: ${python} -m pip install --user numpy`;
}

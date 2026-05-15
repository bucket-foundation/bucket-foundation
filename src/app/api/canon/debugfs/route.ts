/**
 * Temporary debug endpoint: tells us what the canon-search Lambda
 * actually sees on disk. Useful when the API returns
 * `index_empty` and we need to figure out which side of the
 * filesystem-tracing fence the missing files are on.
 *
 * Delete once the search is verified live.
 */

import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function lsTry(p: string, depth = 0): unknown {
  try {
    const stat = fs.statSync(p);
    if (!stat.isDirectory()) return { type: "file", size: stat.size };
    if (depth >= 3) return { type: "dir", note: "depth-capped" };
    const entries = fs.readdirSync(p).slice(0, 20).map((e) => {
      const full = path.join(p, e);
      try {
        const s = fs.statSync(full);
        return { name: e, type: s.isDirectory() ? "dir" : "file", size: s.isDirectory() ? null : s.size };
      } catch {
        return { name: e, error: "stat fail" };
      }
    });
    return { type: "dir", count: fs.readdirSync(p).length, sample: entries };
  } catch (e) {
    return { type: "missing", error: (e as Error).message };
  }
}

export function GET() {
  const cwd = process.cwd();
  const probes = [
    cwd,
    path.join(cwd, "_intake"),
    path.join(cwd, "_intake", "embeddings-v2"),
    path.join(cwd, "_intake", "embeddings"),
    path.join(cwd, "_intake", "embeddings-v2", "claims-vectors.npy"),
    path.join(cwd, "_intake", "embeddings", "claim-evidence.jsonl"),
    path.join(cwd, "bucket-canon"),
    path.join(cwd, "bucket-canon", "01-mathematics"),
    path.join(cwd, "bucket-canon", "05-biophysics", "sub-claims"),
  ];
  const out: Record<string, unknown> = { cwd };
  for (const p of probes) {
    out[p.replace(cwd, "<cwd>")] = lsTry(p);
  }
  return new Response(JSON.stringify(out, null, 2), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

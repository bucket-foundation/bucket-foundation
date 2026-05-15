import fs from "fs";
import path from "path";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function lsTry(p) {
  try {
    const stat = fs.statSync(p);
    if (!stat.isDirectory()) return { type: "file", size: stat.size };
    const entries = fs.readdirSync(p).slice(0, 30);
    return { type: "dir", count: fs.readdirSync(p).length, sample: entries };
  } catch (e) { return { type: "missing", error: e.message }; }
}
export function GET() {
  const cwd = process.cwd();
  const probes = [
    cwd, path.join(cwd, "_intake"), path.join(cwd, "_intake", "embeddings"),
    path.join(cwd, "_intake", "embeddings-v2"),
    path.join(cwd, "_intake", "embeddings-v2", "claims-vectors.npy"),
    path.join(cwd, "_intake", "embeddings", "claim-evidence.jsonl"),
    path.join(cwd, "bucket-canon"),
    path.join(cwd, "bucket-canon", "01-mathematics", "sub-claims"),
    path.join(cwd, "bucket-canon", "05-biophysics", "sub-claims"),
  ];
  const out = { cwd };
  for (const p of probes) out[p.replace(cwd, "<cwd>")] = lsTry(p);
  return new Response(JSON.stringify(out, null, 2), { headers: { "content-type": "application/json" } });
}

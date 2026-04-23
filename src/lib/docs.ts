/**
 * Server-side doc loader. Reads strategic markdown docs from the repo root
 * at build time. No deps.
 */
import fs from "fs";
import path from "path";

const DOC_ROOT = path.join(process.cwd());

export function readDoc(name: string): string {
  const safe = name.replace(/[^A-Za-z0-9._-]/g, "");
  const p = path.join(DOC_ROOT, safe);
  try {
    return fs.readFileSync(p, "utf-8");
  } catch {
    return `# ${safe}\n\n_Document not found._`;
  }
}

/**
 * Research OS for K-12, ingestion CLI helper (bkt-ros, ingestion slice).
 * Filesystem loader for learning/app/corpus/*.json, shared by
 * academy-import.ts (task item 1, the corpus IS the import) and
 * canon-import.ts (task item 2, the corpus is the derives_from match
 * target): both need the exact same file list and the exact same
 * AcademyCorpusFile shape, so a canon entry's derives_from edge always
 * points at the slug academy-import.ts writes
 * (src/lib/research-os/ingest/academy.ts's `academyNodeSlug`).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { isAcademyCorpusFile, type AcademyCorpusFile } from "../../../../src/lib/research-os/ingest/academy";

export function loadAcademyCorpusFiles(repoRoot: string): AcademyCorpusFile[] {
  const corpusDir = join(repoRoot, "learning", "app", "corpus");
  const files: AcademyCorpusFile[] = [];
  for (const name of readdirSync(corpusDir).sort()) {
    if (!name.endsWith(".json")) continue;
    const full = join(corpusDir, name);
    let json: unknown;
    try {
      json = JSON.parse(readFileSync(full, "utf8"));
    } catch (err) {
      console.error(`[load-academy-corpus] skipping ${name}: JSON parse failed: ${(err as Error).message}`);
      continue;
    }
    if (!isAcademyCorpusFile(json)) continue; // language corpora / index.json
    files.push({
      sourceFile: `learning/app/corpus/${name}`,
      branch: json.meta.branch,
      atoms: json.atoms,
    });
  }
  return files;
}

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
    if (!isAcademyCorpusFile(json)) continue;
    files.push({
      sourceFile: `learning/app/corpus/${name}`,
      branch: json.meta.branch,
      atoms: json.atoms,
    });
  }
  return files;
}

import driveIndex from "./fixtures/canon-drive.json";
import { coverage, tokens, type Hit } from "./search";

export interface CanonFile {
  title: string;
  branch: string;
  path: string;
  size: number;
}

export const CANON_FILES = (driveIndex as { files: CanonFile[] }).files;
export const CANON_FILE_WEIGHT = 0.7;

export function canonFileId(f: Pick<CanonFile, "path">): string {
  return `canon-file:${f.path}`;
}

export function canonFileHits(query: string, files: CanonFile[] = CANON_FILES, topK = 5): Hit[] {
  const q = tokens(query);
  return files
    .map((f) => ({ f, cov: coverage(q, tokens(`${f.title} ${f.path.replace(/[/_.-]/g, " ")}`)) }))
    .filter((x) => x.cov > 0)
    .sort((a, b) => b.cov - a.cov || (a.f.path < b.f.path ? -1 : 1))
    .slice(0, topK)
    .map(({ f, cov }) => ({
      id: canonFileId(f),
      type: "canon-file" as const,
      title: f.title,
      subtitle: `${f.branch.replace(/^\d+-/, "")} · ${f.path} · ${f.size} B`,
      text: "",
      score: cov * CANON_FILE_WEIGHT,
      branch: f.branch,
      year: null,
      url: null,
      links: [],
    }));
}

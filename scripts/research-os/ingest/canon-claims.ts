import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadPrimaryPapers } from "../../../src/lib/canon-primary";
import { isLawFolder } from "../../../src/lib/research-os/ingest/canon";

const OUT_DIR = join(__dirname, "out");

function claimTextFor(concept: string, title: string, year: number | null): string {
  if (isLawFolder(concept)) {
    const law = concept.replace(/-/g, " ");
    return `${law}, established in ${title}${year ? ` (${year})` : ""}.`;
  }
  return title;
}

function main() {
  const papers = loadPrimaryPapers();
  const claims = papers.map((p) => ({
    id: p.id,
    branch: p.branch,
    concept: p.concept,
    claimText: claimTextFor(p.concept, p.title, p.year),
  }));

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    join(OUT_DIR, "canon-claims.json"),
    JSON.stringify({ generated_at: new Date().toISOString(), count: claims.length, claims }, null, 2) + "\n",
  );
  console.log(`[canon-claims] wrote ${claims.length} canon claim texts.`);
}

main();

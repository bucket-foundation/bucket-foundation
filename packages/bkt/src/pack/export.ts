import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Item } from "../grade";

export interface Pack {
  version: string;
  source: string;
  items: Item[];
}

interface CorpusFile {
  meta?: { id?: string; branch?: string };
  atoms?: { id: string; title: string; quiz?: { level?: string; prompt: string; answer: string }[] }[];
}

export function itemsFromCorpus(branch: string, corpus: CorpusFile): Item[] {
  const out: Item[] = [];
  for (const atom of corpus.atoms ?? []) {
    (atom.quiz ?? []).forEach((q, i) => {
      if (!q.prompt?.trim() || !q.answer?.trim()) return;
      out.push({
        id: `${branch}/${atom.id}/${i}`,
        atomId: atom.id,
        branch,
        title: atom.title,
        level: q.level ?? "recall",
        prompt: q.prompt.trim(),
        answer: q.answer.trim(),
      });
    });
  }
  return out;
}

export function buildPack(corpusDir: string): Pack {
  const items: Item[] = [];
  for (const file of readdirSync(corpusDir).filter((f) => f.endsWith(".json")).sort()) {
    const corpus = JSON.parse(readFileSync(join(corpusDir, file), "utf8")) as CorpusFile;
    if (!Array.isArray(corpus.atoms)) continue;
    items.push(...itemsFromCorpus(file.replace(/\.json$/, ""), corpus));
  }
  const version = createHash("sha256").update(JSON.stringify(items)).digest("hex").slice(0, 12);
  return { version, source: "learning/app/corpus", items };
}

if (import.meta.main) {
  const root = resolve(import.meta.dir, "../../../..");
  const pack = buildPack(join(root, "learning/app/corpus"));
  const outDir = resolve(import.meta.dir, "../../content");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "pack.json"), JSON.stringify(pack));
  console.log(`pack ${pack.version}: ${pack.items.length} items`);
}

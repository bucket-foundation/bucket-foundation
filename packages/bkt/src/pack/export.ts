import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Atom } from "../../../../src/lib/academy/engine";
import { contentItemId, type Item } from "../grade";

export interface PackDeck {
  id: string;
  source: string;
  title: string;
  atoms: number;
}

export interface Pack {
  version: string;
  source: string;
  items: Item[];
  decks?: PackDeck[];
  atoms?: Record<string, Atom[]>;
}

interface CorpusFile {
  meta?: { id?: string; branch?: string; title?: string };
  atoms?: (Atom & { quiz?: { level?: string; prompt: string; answer: string }[] })[];
}

const ATOM_FIELDS = ["id", "title", "shell", "type", "requires", "equation", "summary", "lesson", "quiz", "gloss"] as const;

export function slimAtom(a: Atom): Atom {
  const out: Record<string, unknown> = {};
  for (const k of ATOM_FIELDS) if (a[k] !== undefined) out[k] = a[k];
  return out as unknown as Atom;
}

function readIndex(corpusDir: string): Map<string, { id: string; title: string }> {
  const byFile = new Map<string, { id: string; title: string }>();
  try {
    const idx = JSON.parse(readFileSync(join(corpusDir, "index.json"), "utf8")) as { decks?: { id: string; file: string; kind?: string; pill?: string }[] };
    for (const d of idx.decks ?? []) {
      if (d.kind === "language") continue;
      byFile.set(d.file.replace(/^corpus\//, "").replace(/\.json$/, ""), { id: d.id, title: (d.pill ?? d.id).replace(/^\S+\s+\u00b7\s+/, "") });
    }
  } catch {
    return byFile;
  }
  return byFile;
}

export function itemsFromCorpus(branch: string, corpus: CorpusFile): Item[] {
  const out: Item[] = [];
  const seen = new Set<string>();
  for (const atom of corpus.atoms ?? []) {
    (atom.quiz ?? []).forEach((q) => {
      if (!q.prompt?.trim() || !q.answer?.trim()) return;
      let id = contentItemId(branch, atom.id, q.prompt);
      if (seen.has(id)) id = contentItemId(branch, atom.id, `${q.prompt}\n${q.answer}`);
      seen.add(id);
      out.push({
        id,
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
  const decks: PackDeck[] = [];
  const atoms: Record<string, Atom[]> = {};
  const index = readIndex(corpusDir);
  for (const file of readdirSync(corpusDir).filter((f) => f.endsWith(".json")).sort()) {
    const corpus = JSON.parse(readFileSync(join(corpusDir, file), "utf8")) as CorpusFile;
    if (!Array.isArray(corpus.atoms)) continue;
    const source = file.replace(/\.json$/, "");
    items.push(...itemsFromCorpus(source, corpus));
    const deck = index.get(source);
    if (!deck) continue;
    atoms[deck.id] = corpus.atoms.map(slimAtom);
    decks.push({ id: deck.id, source, title: deck.title, atoms: corpus.atoms.length });
  }
  const version = createHash("sha256").update(JSON.stringify([items, atoms])).digest("hex").slice(0, 12);
  decks.sort((a, b) => a.id.localeCompare(b.id));
  return { version, source: "learning/app/corpus", items, decks, atoms };
}

if (import.meta.main) {
  const root = resolve(import.meta.dir, "../../../..");
  const pack = buildPack(join(root, "learning/app/corpus"));
  const outDir = resolve(import.meta.dir, "../../content");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "pack.json"), JSON.stringify(pack));
  console.log(`pack ${pack.version}: ${pack.items.length} items`);
}

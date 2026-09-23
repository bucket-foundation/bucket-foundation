import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Corpus } from "./mastery";

const ROOT = process.cwd();
const PUBLIC_DIR = join(ROOT, "public", "academy-app", "corpus");
const SRC_DIR = join(ROOT, "learning", "app", "corpus");

function corpusDir(): string {
  return existsSync(PUBLIC_DIR) ? PUBLIC_DIR : SRC_DIR;
}

interface DeckEntry {
  id: string;
  file: string;
  pill?: string;
  sub?: string;
  kind?: string;
}

let _index: DeckEntry[] | null = null;
function loadIndex(): DeckEntry[] {
  if (_index) return _index;
  try {
    const raw = readFileSync(join(corpusDir(), "index.json"), "utf8");
    const parsed = JSON.parse(raw) as { decks?: DeckEntry[] };
    _index = parsed.decks || [];
  } catch {
    _index = [];
  }
  return _index;
}

const _corpusCache = new Map<string, Corpus | null>();

function readCorpusFile(file: string): Corpus | null {
  const name = file.replace(/^corpus\//, "");
  const p = join(corpusDir(), name);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as Corpus;
  } catch {
    return null;
  }
}

export function loadCorpusForBranch(slug: string): Corpus | null {
  if (!slug || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(slug)) return null;
  if (_corpusCache.has(slug)) return _corpusCache.get(slug) || null;

  const decks = loadIndex();
  let corpus: Corpus | null = null;

  const byId = decks.find((d) => d.id === slug);
  if (byId) corpus = readCorpusFile(byId.file);

  if (!corpus) {
    const byFile = decks.find(
      (d) => d.file.replace(/^corpus\//, "").replace(/\.json$/, "") === slug
    );
    if (byFile) corpus = readCorpusFile(byFile.file);
  }

  if (!corpus) corpus = readCorpusFile(slug + ".json");

  if (!corpus) {
    for (const d of decks) {
      const c = readCorpusFile(d.file);
      if (c && c.meta?.branch === slug) {
        corpus = c;
        break;
      }
    }
  }

  if (corpus && corpus.atoms) ensureLeverage(corpus);

  _corpusCache.set(slug, corpus);
  return corpus;
}

export function branchLabel(slug: string): string {
  const decks = loadIndex();
  const d =
    decks.find((x) => x.id === slug) ||
    decks.find((x) => x.file.replace(/^corpus\//, "").replace(/\.json$/, "") === slug);
  if (d && d.pill) return d.pill.replace(/^\S+\s+·\s+/, "");
  return slug;
}

export function allBranchSlugs(): string[] {
  return loadIndex().map((d) => d.id);
}

function ensureLeverage(corpus: Corpus): void {
  const atoms = corpus.atoms || [];
  const byId: Record<string, { unlocks: string[]; requires?: string[] }> = {};
  const raw: Record<string, { requires?: string[]; unlocks?: string[]; leverage?: number }> = {};
  for (const a of atoms as unknown as { id: string; requires?: string[]; unlocks?: string[]; leverage?: number }[]) {
    raw[a.id] = a;
    byId[a.id] = { unlocks: (a.unlocks || []).slice(), requires: a.requires };
  }
  for (const a of atoms as unknown as { id: string; requires?: string[] }[]) {
    for (const r of a.requires || []) {
      if (byId[r] && !byId[r].unlocks.includes(a.id)) byId[r].unlocks.push(a.id);
    }
  }
  const reach: Record<string, number> = {};
  function descendants(id: string, seen: Set<string>): Set<string> {
    const node = byId[id];
    if (!node) return seen;
    for (const u of node.unlocks) {
      if (!seen.has(u)) {
        seen.add(u);
        descendants(u, seen);
      }
    }
    return seen;
  }
  let max = 1;
  for (const a of atoms as unknown as { id: string }[]) {
    const n = descendants(a.id, new Set<string>()).size + byId[a.id].unlocks.length * 0.5;
    reach[a.id] = n;
    if (n > max) max = n;
  }
  for (const a of atoms as unknown as { id: string; leverage?: number }[]) {
    if (typeof raw[a.id].leverage !== "number") {
      raw[a.id].leverage = +(reach[a.id] / max).toFixed(3);
    }
  }
}

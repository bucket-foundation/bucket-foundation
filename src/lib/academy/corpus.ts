/**
 * src/lib/academy/corpus.ts (bkt-coh)
 * ------------------------------------------------------------------
 * Server-side loader for the Academy branch corpora, used by the public
 * Mastery Profile to translate a learner's stored FSRS state (keyed by branch
 * slug) into a per-branch-mastery rollup.
 *
 * The corpora are static JSON shipped in the repo. The source of truth is
 * learning/app/corpus/*.json; scripts/sync-academy.mjs mirrors them into
 * public/academy-app/corpus/*.json at build time. We read from the public copy
 * (always present at runtime on Vercel) and fall back to the source folder for
 * local/dev. Results are cached in-process for the lifetime of the lambda.
 *
 * The branch SLUG stored in bucket.academy_progress.branch is corpus
 * `meta.branch` (e.g. "01-mathematics", "biophysics", "lang-core"). The
 * filename differs. index.json maps deck id -> file; note id "05-biophysics" maps to
 * the file biophysics.json whose meta.branch is "biophysics". We build a
 * slug->file map that tolerates both.
 */
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
  // `file` is like "corpus/01-mathematics.json" (relative to the app root) or a
  // bare filename. Normalize to a filename under the corpus dir.
  const name = file.replace(/^corpus\//, "");
  const p = join(corpusDir(), name);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as Corpus;
  } catch {
    return null;
  }
}

/**
 * Resolve a stored branch slug (academy_progress.branch) to its corpus.
 * Tries, in order:
 * 1. index.json deck whose `id` === slug,
 * 2. index.json deck whose file basename (minus .json) === slug,
 * 3. a file named "<slug>.json" directly,
 * 4. any built-in corpus whose meta.branch === slug.
 * Returns null for unknown / user-generated decks (those have no static corpus
 * and are omitted from the public profile).
 */
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
    // last resort: scan built-ins for a matching meta.branch
    for (const d of decks) {
      const c = readCorpusFile(d.file);
      if (c && c.meta?.branch === slug) {
        corpus = c;
        break;
      }
    }
  }

  // Ensure leverage is populated (the static app computes it at runtime in
  // engine._computeLeverage; the corpus JSON omits it). We derive a
  // cheap leverage = normalized unlock-reach so node sizing on the public map
  // matches the in-app encoding even when the JSON has none.
  if (corpus && corpus.atoms) ensureLeverage(corpus);

  _corpusCache.set(slug, corpus);
  return corpus;
}

/** Friendly display label for a branch slug (the Roman-numeral pill, stripped). */
export function branchLabel(slug: string): string {
  const decks = loadIndex();
  const d =
    decks.find((x) => x.id === slug) ||
    decks.find((x) => x.file.replace(/^corpus\//, "").replace(/\.json$/, "") === slug);
  if (d && d.pill) return d.pill.replace(/^\S+\s+·\s+/, "");
  return slug;
}

/** All built-in branch slugs (deck ids), in canon order. */
export function allBranchSlugs(): string[] {
  return loadIndex().map((d) => d.id);
}

/**
 * Mirror engine._computeLeverage: leverage = normalized count of everything an
 * atom transitively unlocks, blended with out-degree. Derived from `requires`
 * when `unlocks` is absent, identical to the app, so the public map sizes nodes
 * the same way the in-app map does.
 */
function ensureLeverage(corpus: Corpus): void {
  const atoms = corpus.atoms || [];
  const byId: Record<string, { unlocks: string[]; requires?: string[] }> = {};
  const raw: Record<string, { requires?: string[]; unlocks?: string[]; leverage?: number }> = {};
  for (const a of atoms as unknown as { id: string; requires?: string[]; unlocks?: string[]; leverage?: number }[]) {
    raw[a.id] = a;
    byId[a.id] = { unlocks: (a.unlocks || []).slice(), requires: a.requires };
  }
  // derive unlocks from requires
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

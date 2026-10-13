import fs from "node:fs";
import path from "node:path";
import { buildWordSet, type RawSubset, type WordSet } from "./polingual-forms";

export const SUBSET_FILE = "learning/app/polingual/subset.json";

let cached: { file: string; set: WordSet } | null = null;

export function subsetPath(start: string = process.cwd()): string {
  if (process.env.POLINGUAL_SUBSET_PATH) return process.env.POLINGUAL_SUBSET_PATH;
  for (let dir = path.resolve(start); ; dir = path.dirname(dir)) {
    const file = path.join(dir, ...SUBSET_FILE.split("/"));
    if (fs.existsSync(file)) return file;
    if (path.dirname(dir) === dir) throw new Error(`the Polingual word set ${SUBSET_FILE} was not found above ${start}; set POLINGUAL_SUBSET_PATH`);
  }
}

export function loadWordSet(file: string = subsetPath()): WordSet {
  if (cached?.file === file) return cached.set;
  const set = buildWordSet(JSON.parse(fs.readFileSync(file, "utf8")) as RawSubset);
  cached = { file, set };
  return set;
}

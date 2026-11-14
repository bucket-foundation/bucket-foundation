import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import { join } from "node:path";

export const WORDS_FILE = join(process.cwd(), "src/data/words.json");

function gitDate(file: string): Date | undefined {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cI", "--", file], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    const d = new Date(out);
    return out && !Number.isNaN(d.getTime()) ? d : undefined;
  } catch {
    return undefined;
  }
}

export function wordsLastModified(file = WORDS_FILE): Date | undefined {
  const fromGit = gitDate(file);
  if (fromGit) return fromGit;
  try {
    return statSync(file).mtime;
  } catch {
    return undefined;
  }
}

export function isWordPath(path: string): boolean {
  return /^(\/[a-z]{2})?\/word(\/|$)/.test(path);
}

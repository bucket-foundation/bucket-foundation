import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Bank, Review } from "./bank";
import type { AiScores } from "./probe";
import type { Submission } from "./score";

export function haiDir(env = process.env): string {
  return env.BKT_HAI_DIR ?? resolve(import.meta.dir, "../../hai");
}

function readJson<T>(path: string): T | null {
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : null;
}

function writeJson(path: string, v: unknown) {
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(v, null, 1) + "\n");
}

export const files = (dir = haiDir()) => ({
  bank: join(dir, "bank.json"),
  review: join(dir, "review.json"),
  scores: join(dir, "ai-scores.json"),
  submission: join(dir, "submission.json"),
});

export function loadBank(dir?: string) {
  return readJson<Bank>(files(dir).bank);
}
export function loadReview(dir?: string) {
  return readJson<Review>(files(dir).review);
}
export function loadScores(dir?: string) {
  return readJson<AiScores>(files(dir).scores);
}
export function loadSubmission(dir?: string) {
  return readJson<Submission>(files(dir).submission);
}
export function save(kind: keyof ReturnType<typeof files>, v: unknown, dir?: string) {
  writeJson(files(dir)[kind], v);
}

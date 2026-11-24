import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const learning = join(root, "../learning/app");
const out = join(root, "public/academy-app");

export const COPIES = [
  ["corpus", "corpus"],
  ["polingual/top1000", "polingual/top1000"],
  ["audio", "audio"],
];

export function syncCorpus(src = learning, dest = out) {
  for (const [from, to] of COPIES) {
    const s = join(src, from);
    if (!existsSync(s)) throw new Error(`missing ${s}`);
    const d = join(dest, to);
    rmSync(d, { recursive: true, force: true });
    mkdirSync(dirname(d), { recursive: true });
    cpSync(s, d, { recursive: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) syncCorpus();

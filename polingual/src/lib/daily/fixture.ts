import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildLangCorpus, type LangCorpus } from "@academy/lang-systems";

let cached: LangCorpus | null = null;

export function nativeCorpus(): LangCorpus {
  if (cached) return cached;
  const dir = join(process.cwd(), "../apple/Shared/Corpus");
  const read = (n: string) => JSON.parse(readFileSync(join(dir, n), "utf8"));
  cached = buildLangCorpus(read("lang-core.json"), read("lang-cognates.json"), read("lang-phrases.json"), read("lang-layers.json"));
  return cached;
}

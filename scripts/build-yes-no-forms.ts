import fs from "node:fs";
import path from "node:path";
import { fnv1a32 } from "../src/lib/academy/input-experiment";
import { assembleTest, buildLexicon, type TestItem } from "../src/lib/academy/yes-no-test";

export const FORMS_VERSION = "ci14-yesno-v1";

export function buildForms(lang: string, ranked: { word: string; rank: number }[], forms: string[]): { A: TestItem[]; B: TestItem[] } | null {
  const lex = buildLexicon(ranked.map((r) => r.word), forms);
  const A = assembleTest(ranked, new Set(), fnv1a32(`${FORMS_VERSION}:${lang}:A`), lex);
  if (!A) return null;
  const B = assembleTest(ranked, new Set(), fnv1a32(`${FORMS_VERSION}:${lang}:B`), lex, new Set(A.map((i) => i.word)));
  return B ? { A, B } : null;
}

if (require.main === module) {
  const [src, ...outDirs] = process.argv.slice(2);
  const { lang, ranked, forms } = JSON.parse(fs.readFileSync(src, "utf8"));
  const built = buildForms(lang, ranked, forms);
  if (!built) {
    console.error(`no forms for ${lang}`);
    process.exit(1);
  }
  const body = JSON.stringify({ format: "polingual-yesno", version: FORMS_VERSION, lang, method: "Wuggy-style subsyllabic substitution (Keuleers and Brysbaert 2010) over Kaikki forms; real words from frequency bands 1 to 8000", forms: built }) + "\n";
  for (const d of outDirs) {
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, `${lang}.json`), body);
  }
}

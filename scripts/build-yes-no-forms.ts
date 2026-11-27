import fs from "node:fs";
import path from "node:path";
import { fnv1a32 } from "../src/lib/academy/input-experiment";
import { assembleTest, buildLexicon, formBalance, FORM_TOLERANCE, normalizeWord, type Lexicon, type TestItem } from "../src/lib/academy/yes-no-test";

export const FORMS_VERSION = "ci14-yesno-v2";
export const MAX_B_SEEDS = 3000;

export function buildForms(lang: string, ranked: { word: string; rank: number }[], lex: Lexicon): { A: TestItem[]; B: TestItem[]; ranks: Record<string, number> } | null {
  const rankOf = new Map<string, number>();
  for (const r of ranked) {
    const w = normalizeWord(r.word);
    if (!rankOf.has(w) || r.rank < rankOf.get(w)!) rankOf.set(w, r.rank);
  }
  const A = assembleTest(ranked, new Set(), fnv1a32(`${FORMS_VERSION}:${lang}:A`), lex);
  if (!A) return null;
  const avoid = new Set(A.map((i) => i.word));
  let best: { B: TestItem[]; gap: number } | null = null;
  for (let i = 0; i < MAX_B_SEEDS; i++) {
    const B = assembleTest(ranked, new Set(), fnv1a32(`${FORMS_VERSION}:${lang}:B:${i}`), lex, avoid);
    if (!B) continue;
    const b = formBalance(A, B, (w) => rankOf.get(w) ?? null);
    const gap = b.realLength / FORM_TOLERANCE.realLength + b.logRank / FORM_TOLERANCE.logRank + b.pseudoLength / FORM_TOLERANCE.pseudoLength;
    if (!best || gap < best.gap) best = { B, gap };
    if (b.realLength <= FORM_TOLERANCE.realLength && b.logRank <= FORM_TOLERANCE.logRank && b.pseudoLength <= FORM_TOLERANCE.pseudoLength) {
      best = { B, gap };
      break;
    }
  }
  if (!best) return null;
  const ranks: Record<string, number> = {};
  for (const it of [...A, ...best.B]) if (it.real) ranks[it.word] = rankOf.get(it.word)!;
  return { A, B: best.B, ranks };
}

if (require.main === module) {
  const [src, rejectFile, ...outDirs] = process.argv.slice(2);
  const { lang, ranked } = JSON.parse(fs.readFileSync(src, "utf8")) as { lang: string; ranked: { word: string; rank: number }[] };
  const reject = fs.readFileSync(rejectFile, "utf8").split("\n").filter(Boolean);
  const lex = buildLexicon(ranked.map((r) => r.word), reject);
  const built = buildForms(lang, ranked, lex);
  if (!built) {
    console.error(`no forms for ${lang}`);
    process.exit(1);
  }
  const clash = [...built.A, ...built.B].filter((i) => !i.real && lex.words.has(i.word));
  if (clash.length) {
    console.error(`pseudowords found in a lexicon: ${clash.map((i) => i.word).join(", ")}`);
    process.exit(1);
  }
  const body =
    JSON.stringify({
      format: "polingual-yesno",
      version: FORMS_VERSION,
      lang,
      method: "Wuggy-style subsyllabic substitution (Keuleers and Brysbaert 2010); pseudowords rejected against Kaikki forms of es, fr, it, pt, de, nl and en; real words from frequency bands 1 to 8000",
      forms: { A: built.A, B: built.B },
      ranks: built.ranks,
    }) + "\n";
  for (const d of outDirs) {
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, `${lang}.json`), body);
  }
  console.log(lang, JSON.stringify(formBalance(built.A, built.B, (w) => built.ranks[w] ?? null)));
}

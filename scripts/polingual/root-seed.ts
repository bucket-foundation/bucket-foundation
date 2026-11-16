import fs from "node:fs";
import path from "node:path";
import { buildLangCorpus, LANG_CODES, type LangCorpus } from "../../src/lib/academy/lang-systems";
import { FORM_THRESHOLD, formMatch, pairCoverage, understandableSet, type PairCoverage } from "../../src/lib/polingual/understandable";

const CORPUS_DIR = path.resolve(__dirname, "../../learning/app/corpus");
const EXAMPLE_COUNT = 12;

type RootEvidence = Record<string, { forms?: Record<string, { roots?: string[]; via?: string }> }>;

const read = (f: string) => JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, f), "utf8"));

export function loadRootEvidence(): RootEvidence {
  return read("lang-cognates.json").concepts;
}

export function loadCorpus(): LangCorpus {
  return buildLangCorpus(read("lang-core.json"), read("lang-cognates.json"), read("lang-phrases.json"), read("lang-layers.json"));
}

export function allPairs(corpus: LangCorpus, langs: string[] = LANG_CODES): PairCoverage[] {
  const out: PairCoverage[] = [];
  for (const known of langs) for (const target of langs) if (known !== target) out.push(pairCoverage([known], target, corpus));
  return out.sort((a, b) => b.share - a.share || a.known[0].localeCompare(b.known[0]) || a.target.localeCompare(b.target));
}

export function rootExamples(corpus: LangCorpus, evidence: RootEvidence = loadRootEvidence(), count: number = EXAMPLE_COUNT): { root: string; gloss: string; forms: Record<string, string> }[] {
  return corpus.items
    .filter((i) => i.kind === "word" && i.root)
    .map((i) => {
      const attested = i.cognateLangs.filter((l) => {
        const f = evidence[i.id]?.forms?.[l];
        return f?.via === "surface" && (f.roots ?? []).includes(i.root as string);
      });
      const langs = attested.filter((l) => attested.some((o) => o !== l && formMatch(i, o, l).similarity >= FORM_THRESHOLD));
      return { id: i.id, root: i.root as string, gloss: i.gloss, forms: Object.fromEntries(langs.map((l) => [l, i.forms[l]])) };
    })
    .filter((e) => Object.keys(e.forms).length >= 3)
    .sort((a, b) => Object.keys(b.forms).length - Object.keys(a.forms).length || a.id.localeCompare(b.id))
    .slice(0, count)
    .map(({ root, gloss, forms }) => ({ root, gloss, forms }));
}

export function rootSeedReport(corpus: LangCorpus) {
  return {
    threshold: FORM_THRESHOLD,
    pairs: allPairs(corpus).map((p) => ({ known: p.known[0], target: p.target, understood: p.understood, total: p.total })),
    examples: rootExamples(corpus),
  };
}

function main(argv: string[]) {
  const corpus = loadCorpus();
  if (argv.includes("--json")) {
    process.stdout.write(JSON.stringify(rootSeedReport(corpus)) + "\n");
    return;
  }
  const words = argv.filter((a) => !a.startsWith("--"));
  if (words.length >= 2) {
    const target = words[words.length - 1];
    const known = words.slice(0, -1);
    const set = understandableSet(known, target, corpus);
    const cov = pairCoverage(known, target, corpus);
    for (const u of set) console.log(`${u.word}\t${u.via.lang}:${u.via.word}\t${u.channel}\t${u.similarity}\t${u.gloss}`);
    console.log(`${known.join("+")} > ${target}\t${cov.understood}/${cov.total}\t${(cov.share * 100).toFixed(1)}%`);
    return;
  }
  const limit = Number((argv.find((a) => a.startsWith("--top=")) ?? "").slice(6)) || Infinity;
  console.log("known\ttarget\tunderstood\ttotal\tshare");
  for (const p of allPairs(corpus).slice(0, limit)) console.log(`${p.known[0]}\t${p.target}\t${p.understood}\t${p.total}\t${(p.share * 100).toFixed(1)}%`);
}

if (require.main === module) main(process.argv.slice(2));

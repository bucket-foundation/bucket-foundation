import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hebrewPhonemes } from "../src/lib/academy/hebrew-phonemes";
import { LANGS } from "../src/lib/academy/lang-systems";

const APP = join(__dirname, "..", "learning", "app");
const CORPUS = join(APP, "corpus", "lang-core.json");
const LAYERS = join(APP, "corpus", "lang-layers.json");
const GOLD = join(APP, "corpus", "_build", "gold");
export const MIN_SHARE = 0.8;

interface CoreAtom {
  id: string;
  category?: string;
  forms: Record<string, { word: string; ipa?: string }>;
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

let soundsCache: Record<string, Record<string, string>> | null = null;

function sounds(): Record<string, Record<string, string>> {
  if (!soundsCache) soundsCache = readJson<Record<string, Record<string, string>>>(join(GOLD, "kaikki-ipa.json"));
  return soundsCache;
}

export function wiktionaryIpa(lang: string, word: string): string | undefined {
  const s = sounds();
  const raw = Object.entries(s[`${lang}-pointed`] ?? {}).find(([, p]) => p === word)?.[0];
  return s[lang]?.[word] ?? (raw ? s[lang]?.[raw] : undefined);
}

export function espeakInput(lang: string, word: string, category: string | undefined): string | null {
  if (lang !== "he") return word;
  const ph = hebrewPhonemes(word, wiktionaryIpa(lang, word), category === "verb");
  return ph ? `[[${ph}]]` : null;
}

export function espeakIpa(lang: string, input: string): string {
  const voice = LANGS[lang]?.espeak;
  if (!voice) return "";
  const out = spawnSync("espeak-ng", ["-q", "--ipa", "-v", voice, "--", input], { encoding: "utf8" });
  if (out.status !== 0) throw new Error(`espeak-ng ${lang} ${input}: ${out.stderr}`);
  return out.stdout.trim().replace(/\s+/g, " ");
}

function main(): void {
  const core = readJson<{ meta: { languages: string[]; bonusLanguages: string[]; extraLanguages?: string[] }; atoms: CoreAtom[] }>(CORPUS);
  const gold = readJson<Record<string, Record<string, string>>>(join(GOLD, "kaikki-extra.json"));
  const base = new Set([...core.meta.languages, ...core.meta.bonusLanguages]);
  const total = core.atoms.length;
  const kept = Object.keys(gold)
    .filter((l) => LANGS[l] && Object.keys(gold[l]).length / total >= MIN_SHARE)
    .sort();
  for (const a of core.atoms) {
    for (const l of Object.keys(a.forms)) if (!base.has(l)) delete a.forms[l];
    for (const l of kept) {
      const raw = gold[l][a.id];
      if (!raw) continue;
      a.forms[l] = { word: sounds()[`${l}-pointed`]?.[raw] ?? raw };
    }
  }
  core.meta.extraLanguages = kept;
  writeFileSync(CORPUS, JSON.stringify(core, null, 2) + "\n");

  const layers = readJson<{ readings: Record<string, Record<string, { ipa?: string }>> }>(LAYERS);
  for (const a of core.atoms) {
    const r = (layers.readings[a.id] ??= {});
    for (const l of Object.keys(r)) if (!base.has(l)) delete r[l];
    for (const l of kept) {
      const f = a.forms[l];
      if (!f) continue;
      const input = espeakInput(l, f.word, a.category);
      const ipa = input ? espeakIpa(l, input) : "";
      if (ipa) r[l] = { ipa };
    }
  }
  writeFileSync(LAYERS, JSON.stringify(layers));
  for (const l of kept) console.log(`${l}: ${core.atoms.filter((a) => a.forms[l]).length}/${total}`);
}

if (require.main === module) main();

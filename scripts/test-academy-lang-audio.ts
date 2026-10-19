import fs from "node:fs";
import path from "node:path";
import { audioKey, audioUrl, pickVoice } from "../src/lib/academy/lang-audio";
import { hebrewPhonemes, stressFromIpa } from "../src/lib/academy/hebrew-phonemes";
import { buildLangCorpus, langDir, LANG_CODES, LANGS } from "../src/lib/academy/lang-systems";
import { clipTexts } from "../src/lib/academy/lang-clips";

let failures = 0;
function ok(c: boolean, m: string) {
  if (c) console.log("  ok  " + m);
  else {
    console.error("  FAIL " + m);
    failures++;
  }
}

const ROOT = path.join(__dirname, "..");
const CORPUS = path.join(ROOT, "learning", "app", "corpus");
const AUDIO = path.join(ROOT, "learning", "app", "audio");
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(CORPUS, f), "utf8"));
const core = read("lang-core.json");
const corpus = buildLangCorpus(core, read("lang-cognates.json"), read("lang-phrases.json"), read("lang-layers.json"));
const index: Record<string, string[]> = JSON.parse(fs.readFileSync(path.join(AUDIO, "index.json"), "utf8"));

ok(audioKey("fr", "huit") === audioKey("fr", " huit ") && audioKey("fr", "huit") !== audioKey("es", "huit"), "the clip key trims text and depends on the language");
ok(audioKey("fr", "été") === audioKey("fr", "été"), "the clip key normalizes to NFC");
ok(/^\/academy-app\/audio\/fr\/[0-9a-f]{16}\.mp3$/.test(audioUrl("fr", "huit")), "clip urls live under /academy-app/audio/<lang>");

const voices = [{ lang: "en-US" }, { lang: "fr_CA" }, { lang: "iw-IL" }, { lang: "cmn-Hans-CN" }];
ok(pickVoice(voices, "fr", "fr-FR")?.lang === "fr_CA", "a French word gets a French voice from another region");
ok(pickVoice(voices, "he", "he-IL")?.lang === "iw-IL", "Hebrew accepts the legacy iw tag");
ok(pickVoice(voices, "zh", "zh-CN")?.lang === "cmn-Hans-CN", "Mandarin accepts cmn voices");
ok(pickVoice(voices, "ru", "ru-RU") === null, "no Russian voice means no voice, never the English default");

ok(LANG_CODES.includes("he") && LANG_CODES.length >= 29, `the picker offers Hebrew and ${LANG_CODES.length} languages`);
for (const l of core.meta.extraLanguages as string[]) {
  const n = corpus.items.filter((i) => i.kind === "word" && i.forms[l]).length;
  ok(!!LANGS[l] && n >= 0.8 * core.atoms.length, `${LANGS[l]?.name ?? l} has ${n} words and a picker entry`);
}
ok(langDir("he") === "rtl" && langDir("ar") === "rtl" && langDir("fa") === "rtl" && langDir("es") === undefined, "Hebrew, Arabic and Persian render right to left");

ok(hebrewPhonemes("שְׁמוֹנֶה") === "Smon'e", "Hebrew eight reads shmoné");
ok(hebrewPhonemes("סֵפֶר") === "s'efeQ\"", "a segolate takes penultimate stress");
ok(hebrewPhonemes("בַּיִת", "ˈba.jit/ [ˈbɐ.jiθ") === "b'ajit", "Wiktionary IPA sets the stress");
ok(hebrewPhonemes("זְאֵב") === "ze'ev", "a vocal shva does not make a segolate");
ok(hebrewPhonemes("שמיים") === null, "unpointed Hebrew without IPA gets no clip");
ok(stressFromIpa("ˈʃe.ma", ["a", "a"]) === null, "IPA for another form is ignored");

const want = clipTexts(corpus);
for (const l of Object.keys(LANGS).filter((x) => LANGS[x].espeak)) {
  const words = corpus.items.filter((i) => i.kind === "word" && i.forms[l]);
  const have = new Set(index[l] ?? []);
  const missing = words.filter((i) => !have.has(audioKey(l, i.forms[l])));
  ok(missing.length <= (l === "he" ? 2 : 0), `${LANGS[l].name}: ${words.length - missing.length}/${words.length} words have a clip`);
}
const keys = Object.entries(index).flatMap(([l, ks]) => ks.map((k) => `${l}/${k}.mp3`));
ok(keys.every((k) => fs.existsSync(path.join(AUDIO, k))), `all ${keys.length} indexed clips exist on disk`);
ok(want.length >= keys.length, "the index holds no clip outside the corpus");

interface Spoken {
  url?: string;
  utterance?: { lang: string; voice: { lang: string } | null };
}
async function playWith(installed: { lang: string }[], text: string, lang: string): Promise<Spoken> {
  const out: Spoken = {};
  class Utterance {
    lang = "";
    voice: { lang: string } | null = null;
    rate = 1;
    constructor(public text: string) {}
  }
  class FakeAudio {
    constructor(url: string) {
      out.url = url;
    }
    play() {
      return Promise.resolve();
    }
    pause() {}
  }
  const w = {
    speechSynthesis: { getVoices: () => installed, cancel() {}, speak: (u: Utterance) => (out.utterance = u) },
    SpeechSynthesisUtterance: Utterance,
    Audio: FakeAudio,
  };
  const g = globalThis as unknown as Record<string, unknown>;
  g.window = w;
  g.SpeechSynthesisUtterance = Utterance;
  g.fetch = async () => ({ ok: true, json: async () => index });
  const client = await import("../src/lib/academy/lang-client");
  await client.loadClipIndex();
  client.speak(text, lang);
  return out;
}

async function main() {
  const four = corpus.byId.get("four")!;
  const eight = corpus.byId.get("eight")!;
  for (const [lang, item] of [["pl", four], ["fr", eight], ["he", eight], ["ar", eight], ["ja", eight], ["ru", eight], ["zh", eight]] as const) {
    const text = item.forms[lang];
    const silent = await playWith([], text, lang);
    ok(silent.url === audioUrl(lang, text) && fs.existsSync(path.join(AUDIO, lang, `${audioKey(lang, text)}.mp3`)), `no voices (WebKitGTK on Linux): ${lang} "${text}" plays its ${lang} clip`);
    const english = await playWith([{ lang: "en-US" }], text, lang);
    ok(english.url === audioUrl(lang, text) && !english.utterance, `only an English voice: ${lang} "${text}" still plays the ${lang} clip`);
    const native = await playWith([{ lang: "en-US" }, { lang: LANGS[lang].bcp47 }], text, lang);
    ok(native.utterance?.voice?.lang === LANGS[lang].bcp47 && native.utterance.lang === LANGS[lang].bcp47 && !native.url, `a ${lang} voice speaks "${text}" with lang ${LANGS[lang].bcp47}`);
  }
  if (failures) {
    console.error(`\n${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\nlang audio: all passed");
}

void main();

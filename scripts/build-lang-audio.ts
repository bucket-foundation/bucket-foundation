import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { join } from "node:path";
import { audioKey } from "../src/lib/academy/lang-audio";
import { clipTexts } from "../src/lib/academy/lang-clips";
import { buildLangCorpus, LANGS } from "../src/lib/academy/lang-systems";
import { espeakInput } from "./build-lang-extra";

const ROOT = join(__dirname, "..");
const CORPUS = join(ROOT, "learning", "app", "corpus");
const OUT = join(ROOT, "learning", "app", "audio");
const ENCODE = ["-loglevel", "error", "-y", "-f", "wav", "-i", "pipe:0", "-af", "silenceremove=start_periods=1:start_threshold=-50dB:stop_periods=1:stop_threshold=-50dB:stop_duration=0.15", "-ac", "1", "-ar", "16000", "-b:a", "16k", "-map_metadata", "-1", "-write_xing", "0"];

interface Job {
  voice: string;
  input: string;
  file: string;
}

function render(job: Job): Promise<void> {
  return new Promise((resolve, reject) => {
    const say = spawn("espeak-ng", ["-v", job.voice, "-s", "135", "--stdout", "--", job.input]);
    const enc = spawn("ffmpeg", [...ENCODE, job.file]);
    say.stdout.pipe(enc.stdin);
    let err = "";
    enc.stderr.on("data", (d) => (err += d));
    say.on("exit", (code) => code !== 0 && reject(new Error(`espeak-ng ${job.voice} ${job.input} exited ${code}`)));
    enc.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${job.file}: ${err}`))));
  });
}

async function pool<T>(items: T[], size: number, run: (t: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (next < items.length) await run(items[next++]);
  }));
}

const TONES: Record<string, [string, number]> = {};
for (const [plain, marks] of Object.entries({ a: "āáǎà", e: "ēéěè", i: "īíǐì", o: "ōóǒò", u: "ūúǔù", ü: "ǖǘǚǜ" })) {
  Array.from(marks).forEach((m, i) => (TONES[m] = [plain, i + 1]));
}

export function numberedPinyin(s: string): string {
  return s
    .normalize("NFC")
    .split(/\s+/)
    .filter(Boolean)
    .map((syl) => {
      let tone = 5;
      const plain = Array.from(syl)
        .map((c) => {
          const t = TONES[c];
          if (!t) return c;
          tone = t[1];
          return t[0];
        })
        .join("")
        .replace(/ü/g, "v")
        .replace(/[^a-zA-Z]/g, "");
      return plain ? `${plain}${tone}` : "";
    })
    .filter(Boolean)
    .join(" ");
}

function spoken(lang: string, text: string, reading: string | undefined, category: string | undefined): { voice: string; input: string } | null {
  const voice = LANGS[lang]?.espeak;
  if (!voice) return null;
  if (lang === "zh") return reading ? { voice: "cmn-latn-pinyin", input: numberedPinyin(reading) } : null;
  if (lang === "ja") return reading ? { voice, input: reading } : null;
  const input = espeakInput(lang, text, category);
  return input ? { voice, input } : null;
}

function read(file: string): unknown {
  return JSON.parse(readFileSync(join(CORPUS, file), "utf8"));
}

async function main(): Promise<void> {
  const core = read("lang-core.json") as { atoms: { category?: string; forms: Record<string, { word: string }> }[] };
  const categories = new Map<string, string | undefined>();
  for (const a of core.atoms) for (const [l, f] of Object.entries(a.forms)) categories.set(`${l}\u0000${f.word}`, a.category);
  const corpus = buildLangCorpus(core as never, read("lang-cognates.json") as never, read("lang-phrases.json") as never, read("lang-layers.json") as never);
  const inputsFile = join(CORPUS, "_build", "audio-inputs.json");
  const before: Record<string, string> = existsSync(inputsFile) ? JSON.parse(readFileSync(inputsFile, "utf8")) : {};
  const inputs: Record<string, string> = {};
  const index: Record<string, string[]> = {};
  const wanted = new Set<string>();

  const jobs: Job[] = [];
  mkdirSync(OUT, { recursive: true });
  const texts = clipTexts(corpus).filter((c) => !process.env.CLIP_LANG || c.lang === process.env.CLIP_LANG);
  for (const c of texts) {
    const how = spoken(c.lang, c.text, c.reading, categories.get(`${c.lang}\u0000${c.text}`));
    if (!how || !how.input.trim()) continue;
    const key = audioKey(c.lang, c.text);
    const dir = join(OUT, c.lang);
    const file = join(dir, `${key}.mp3`);
    const rel = `${c.lang}/${key}.mp3`;
    const recipe = `${how.voice} ${how.input}`;
    wanted.add(rel);
    inputs[rel] = recipe;
    (index[c.lang] ??= []).push(key);
    if (existsSync(file) && before[rel] === recipe) continue;
    mkdirSync(dir, { recursive: true });
    jobs.push({ voice: how.voice, input: how.input, file });
  }
  await pool(jobs, cpus().length, render);
  const made = jobs.length;
  let removed = 0;
  for (const lang of existsSync(OUT) ? readdirSync(OUT) : []) {
    if (lang.endsWith(".json") || lang.startsWith(".")) continue;
    for (const f of readdirSync(join(OUT, lang))) {
      if (!wanted.has(`${lang}/${f}`)) {
        rmSync(join(OUT, lang, f));
        removed++;
      }
    }
  }
  for (const k of Object.keys(index)) index[k].sort();
  writeFileSync(join(OUT, "index.json"), JSON.stringify(index));
  writeFileSync(inputsFile, JSON.stringify(inputs, Object.keys(inputs).sort(), 0));
  console.log(`clips: ${wanted.size} total, ${made} new, ${removed} removed`);
}

if (require.main === module) main().catch((e) => {
  console.error(e);
  process.exit(1);
});

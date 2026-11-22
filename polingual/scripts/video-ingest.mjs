#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildVideo, cuesFrom, indexEntry, mergeTranslations, parseJsonArray, validateVideo, VIDEO_LANGS } from "./video-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, "..", "public", "videos");
const MODEL = process.env.VIDEO_MODEL ?? "claude-opus-5-5";
const NAMES = { en: "English", es: "Spanish", fr: "French", de: "German", pt: "Portuguese", it: "Italian", ja: "Japanese", zh: "Chinese", ko: "Korean", nl: "Dutch", ru: "Russian", ar: "Arabic" };

function args(argv) {
  const o = { urls: [], source: "en", langs: VIDEO_LANGS, dir: null, indexOnly: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--source") o.source = argv[++i];
    else if (a === "--langs") o.langs = argv[++i].split(",");
    else if (a === "--dir") o.dir = argv[++i];
    else if (a === "--index-only") o.indexOnly = true;
    else o.urls.push(a);
  }
  return o;
}

function pull(url, source) {
  const out = execFileSync("agf-yt", ["pull", url, "--venture", "bucket-foundation", "--lang", source], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  return out.trim().split("\n").at(-1);
}

async function client() {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  return new Anthropic();
}

function system(from, to) {
  return `Translate subtitle lines from ${NAMES[from] ?? from} to ${NAMES[to] ?? to} for language learners. Keep each line natural and short, one output line per input line, same order. Reply with a JSON array of strings and nothing else.`;
}

function translateCli(lines, from, to) {
  const out = execFileSync("claude", ["-p", "--model", "sonnet", `${system(from, to)}\n\n${JSON.stringify(lines)}`], { encoding: "utf8", maxBuffer: 1 << 24 });
  return parseJsonArray(out);
}

async function translate(api, lines, from, to) {
  if (!api) return translateCli(lines, from, to);
  const res = await api.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: system(from, to),
    messages: [{ role: "user", content: JSON.stringify(lines) }],
  });
  if (res.stop_reason === "refusal") throw new Error(`translation refused for ${to}`);
  const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return parseJsonArray(text);
}

async function ingest(dir, o, api) {
  const meta = JSON.parse(readFileSync(path.join(dir, "metadata.json"), "utf8"));
  const chunks = JSON.parse(readFileSync(path.join(dir, "transcript.json"), "utf8"));
  let cues = cuesFrom(chunks, o.source);
  const lines = cues.map((c) => c.text[o.source]);
  for (const lang of o.langs) {
    if (lang === o.source) continue;
    cues = mergeTranslations(cues, lang, await translate(api, lines, o.source, lang));
    process.stderr.write(`  ${meta.id} ${lang} done\n`);
  }
  const video = buildVideo({ meta, cues, sourceLang: o.source, langs: [o.source, ...o.langs.filter((l) => l !== o.source)] });
  const errors = validateVideo(video);
  if (errors.length) throw new Error(`${meta.id}: ${errors.join("; ")}`);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, `${video.id}.json`), JSON.stringify(video));
  const thumb = path.join(dir, "thumbnail.jpg");
  if (existsSync(thumb)) copyFileSync(thumb, path.join(OUT, `${video.id}.jpg`));
  return video.id;
}

function writeIndex() {
  const videos = readdirSync(OUT)
    .filter((f) => f.endsWith(".json") && f !== "index.json")
    .map((f) => JSON.parse(readFileSync(path.join(OUT, f), "utf8")))
    .sort((a, b) => a.title.localeCompare(b.title));
  const index = videos.map((v) => indexEntry(v, existsSync(path.join(OUT, `${v.id}.jpg`)) ? `/videos/${v.id}.jpg` : `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`));
  writeFileSync(path.join(OUT, "index.json"), JSON.stringify(index, null, 1));
  return index.length;
}

async function main() {
  const o = args(process.argv.slice(2));
  if (!o.indexOnly) {
    const dirs = o.dir ? [o.dir] : o.urls.map((u) => pull(u, o.source));
    if (!dirs.length) {
      console.error("usage: video-ingest <youtube-url>... [--source es] [--langs en,es,fr,de,pt,it,ja] | --dir <agf-yt folder> | --index-only");
      process.exit(2);
    }
    const api = process.env.VIDEO_TRANSLATOR === "cli" ? null : await client();
    for (const d of dirs) console.log(`wrote ${await ingest(d, o, api)}`);
  }
  console.log(`index: ${writeIndex()} videos`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

"use client";

import type { TopWord } from "./placement-cefr";
import { buildLangCorpus, LANGS, mergeSystems, normalizeSystemsDoc, type LangCorpus, type LangSystem, type RawLayers, type SystemsDoc } from "./lang-systems";
import { AUDIO_BASE, audioKey, audioUrl, pickVoice } from "./lang-audio";
import { pullServer, type ServerBranches } from "./progress-store";

const BASE = "/academy-app/corpus";
export const SYSTEMS_KEY = "bucket-academy-lang/v1/systems";
export const SYSTEMS_BRANCH = "lang-systems";

let corpusPromise: Promise<LangCorpus | null> | null = null;

async function getJson(file: string): Promise<unknown> {
  const r = await fetch(`${BASE}/${file}`, { cache: "force-cache" });
  if (!r.ok) throw new Error(`${file} ${r.status}`);
  return r.json();
}

const topCache = new Map<string, Promise<TopWord[] | null>>();

export function loadTopWords(lang: string): Promise<TopWord[] | null> {
  if (!topCache.has(lang)) {
    topCache.set(
      lang,
      fetch(`/academy-app/polingual/top1000/${lang}.json`, { cache: "force-cache" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => (Array.isArray(d) ? (d as TopWord[]) : null))
        .catch(() => null)
    );
  }
  return topCache.get(lang)!;
}

export function loadLangCorpus(): Promise<LangCorpus | null> {
  if (!corpusPromise) {
    corpusPromise = Promise.all([getJson("lang-core.json"), getJson("lang-cognates.json"), getJson("lang-phrases.json"), getJson("lang-layers.json").catch(() => null)])
      .then(([core, cog, ph, layers]) => buildLangCorpus(core as never, cog as never, ph as never, layers as RawLayers | null))
      .then((c) => (c.items.length ? c : null))
      .catch(() => {
        corpusPromise = null;
        return null;
      });
  }
  return corpusPromise;
}

function readLocalSystems(): SystemsDoc {
  try {
    const raw = localStorage.getItem(SYSTEMS_KEY);
    return normalizeSystemsDoc(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeSystemsDoc(null);
  }
}

function writeLocalSystems(doc: SystemsDoc): void {
  try {
    localStorage.setItem(SYSTEMS_KEY, JSON.stringify(doc));
  } catch {
  }
}

export async function loadSystems(server?: ServerBranches | null): Promise<LangSystem[]> {
  const remote = server === undefined ? await pullServer() : server;
  const merged = mergeSystems(readLocalSystems(), normalizeSystemsDoc(remote?.[SYSTEMS_BRANCH]?.data));
  writeLocalSystems(merged);
  return merged.systems;
}

export type SaveResult = "synced" | "local-only" | "failed";

export interface SystemsChange {
  upsert?: LangSystem;
  remove?: string;
}

const RETRY_MS = [0, 800, 2500];

export async function saveSystems(change: SystemsChange, deps: { pull?: typeof pullServer; post?: (doc: SystemsDoc) => Promise<Response> } = {}): Promise<{ result: SaveResult; systems: LangSystem[] }> {
  const pull = deps.pull ?? pullServer;
  const post = deps.post ?? ((doc: SystemsDoc) => fetch("/api/academy/progress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ branch: SYSTEMS_BRANCH, data: doc }) }));
  const delta: SystemsDoc = { systems: change.upsert ? [change.upsert] : [], removed: change.remove ? { [change.remove]: Date.now() } : {} };
  let doc = mergeSystems(readLocalSystems(), delta);
  writeLocalSystems(doc);
  for (const wait of RETRY_MS) {
    if (wait) await new Promise((r) => setTimeout(r, wait));
    try {
      const server = await pull();
      if (server === null) return { result: "local-only", systems: doc.systems };
      doc = mergeSystems(mergeSystems(doc, normalizeSystemsDoc(server[SYSTEMS_BRANCH]?.data)), delta);
      writeLocalSystems(doc);
      const res = await post(doc);
      if (res.status === 401) return { result: "local-only", systems: doc.systems };
      if (res.ok) return { result: "synced", systems: doc.systems };
    } catch {
    }
  }
  return { result: "failed", systems: doc.systems };
}

const READINGS_KEY = "bucket-academy-lang/v1/readings";

export function readReadingsPref(): boolean {
  try {
    return localStorage.getItem(READINGS_KEY) !== "off";
  } catch {
    return true;
  }
}

export function writeReadingsPref(on: boolean): void {
  try {
    localStorage.setItem(READINGS_KEY, on ? "on" : "off");
  } catch {
  }
}

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function";
}

const CLIP_INDEX = `${AUDIO_BASE}/index.json`;
let clipIndex: Map<string, Set<string>> | null = null;
let clipPromise: Promise<void> | null = null;

export function loadClipIndex(): Promise<void> {
  if (!clipPromise) {
    clipPromise = fetch(CLIP_INDEX, { cache: "force-cache" })
      .then((r): Promise<Record<string, string[]>> => (r.ok ? r.json() : Promise.resolve({})))
      .then((doc) => {
        clipIndex = new Map(Object.entries(doc).map(([l, keys]) => [l, new Set(keys)]));
      })
      .catch(() => {
        clipPromise = null;
      });
  }
  return clipPromise;
}

export function hasClip(lang: string, text: string): boolean {
  return !!clipIndex?.get(lang)?.has(audioKey(lang, text));
}

function voiceFor(lang: string): SpeechSynthesisVoice | null {
  if (!speechSupported()) return null;
  return pickVoice(window.speechSynthesis.getVoices(), lang, LANGS[lang]?.bcp47 ?? lang);
}

export function canSpeak(text: string, lang: string): boolean {
  if (typeof window === "undefined" || !text) return false;
  return voiceFor(lang) !== null || hasClip(lang, text);
}

let clip: HTMLAudioElement | null = null;

function playClip(text: string, lang: string): boolean {
  if (!hasClip(lang, text) || typeof window.Audio !== "function") return false;
  try {
    if (speechSupported()) window.speechSynthesis.cancel();
    clip?.pause();
    clip = new window.Audio(audioUrl(lang, text));
    void clip.play().catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

export function speak(text: string, lang: string): boolean {
  if (typeof window === "undefined" || !text) return false;
  const voice = voiceFor(lang);
  if (!voice) return playClip(text, lang);
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    clip?.pause();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.9;
    synth.speak(u);
    return true;
  } catch {
    return playClip(text, lang);
  }
}

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

function recognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function recognitionSupported(): boolean {
  return recognitionCtor() !== null;
}

export function listenOnce(lang: string): Promise<string[]> {
  const Ctor = recognitionCtor();
  if (!Ctor) return Promise.resolve([]);
  return new Promise((resolve) => {
    const r = new Ctor();
    let done = false;
    const finish = (xs: string[]) => {
      if (done) return;
      done = true;
      resolve(xs);
    };
    r.lang = LANGS[lang]?.bcp47 ?? lang;
    r.interimResults = false;
    r.maxAlternatives = 5;
    r.onresult = (e) => {
      const first = e.results[0];
      const out: string[] = [];
      for (let i = 0; i < (first?.length ?? 0); i++) out.push(first[i].transcript);
      finish(out);
    };
    r.onerror = () => finish([]);
    r.onend = () => finish([]);
    try {
      r.start();
      window.setTimeout(() => {
        try {
          r.stop();
        } catch {
        }
      }, 6000);
    } catch {
      finish([]);
    }
  });
}

import { isSilent, subscribeSilent } from "./silent";
export type SpeakItem = { id: string; text: string; lang: string; src?: string };
export type VoiceLike = { lang: string; name: string };
type SpeakSource<V extends VoiceLike = VoiceLike> = { kind: "recording"; src: string; voice?: V } | { kind: "voice"; voice: V };

export const BCP47: Record<string, string> = {
  en: "en-US", es: "es-ES", fr: "fr-FR", it: "it-IT", pt: "pt-BR", de: "de-DE", nl: "nl-NL", sv: "sv-SE",
  ru: "ru-RU", ja: "ja-JP", ar: "ar-SA", el: "el-GR", fi: "fi-FI", hi: "hi-IN", ko: "ko-KR", pl: "pl-PL",
  zh: "zh-CN", ang: "ang", cs: "cs-CZ", fa: "fa-IR", grc: "grc", he: "he-IL", id: "id-ID", la: "la",
  sa: "sa-IN", ta: "ta-IN", th: "th-TH", tr: "tr-TR", vi: "vi-VN",
};

const ALIASES: Record<string, string[]> = { he: ["iw"], id: ["in"] };

export function commonsFileUrl(file: string): string {
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, "_"))}`;
}

export function bcp47(code: string): string {
  return BCP47[code] ?? code;
}

const norm = (tag: string) => tag.replace(/_/g, "-").toLowerCase();

export function pickVoice<V extends VoiceLike>(voices: readonly V[], tag: string): V | undefined {
  const want = norm(tag);
  const primary = want.split("-")[0];
  const accepted = [primary, ...(ALIASES[primary] ?? [])];
  return voices.find((v) => norm(v.lang) === want) ?? voices.find((v) => accepted.includes(norm(v.lang).split("-")[0]));
}

export function pickSource<V extends VoiceLike>(item: Pick<SpeakItem, "lang" | "src">, voices: readonly V[]): SpeakSource<V> | undefined {
  const voice = pickVoice(voices, item.lang);
  if (item.src) return { kind: "recording", src: item.src, voice };
  return voice ? { kind: "voice", voice } : undefined;
}

export function playable<V extends VoiceLike>(item: Pick<SpeakItem, "lang" | "src">, voices: readonly V[]): boolean {
  return pickSource(item, voices) !== undefined;
}

type PlayerState = { id: string | null; all: boolean; notice?: string | null };

const IDLE: PlayerState = { id: null, all: false };
export const START_MS = 300;
let state: PlayerState = IDLE;
let token = 0;
let finish: (() => void) | null = null;
const listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function snapshot(): PlayerState {
  return state;
}

export function idle(): PlayerState {
  return IDLE;
}

function set(next: PlayerState) {
  state = next;
  for (const l of listeners) l();
}

let shared: HTMLAudioElement | null = null;

function sharedAudio(): HTMLAudioElement {
  shared ??= new Audio();
  shared.preload = "auto";
  return shared;
}

export function resetPlayer() {
  stop();
  shared = null;
}

function synth(): SpeechSynthesis | undefined {
  return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : undefined;
}

let voiceCache: SpeechSynthesisVoice[] = [];

function preloadVoices(): SpeechSynthesisVoice[] {
  const s = synth();
  if (!s) return voiceCache;
  const got = s.getVoices();
  if (got.length) voiceCache = got;
  if (!preloaded) {
    preloaded = true;
    s.addEventListener?.("voiceschanged", () => {
      voiceCache = s.getVoices();
    });
  }
  return voiceCache;
}

let preloaded = false;

export function installedVoices(): SpeechSynthesisVoice[] {
  const got = synth()?.getVoices() ?? [];
  if (got.length) voiceCache = got;
  return got.length ? got : voiceCache;
}

if (typeof window !== "undefined") preloadVoices();

function langLabel(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code.split("-")[0]) ?? code;
  } catch {
    return code;
  }
}

export function reasonFor(item: Pick<SpeakItem, "lang" | "src">): string | null {
  if (typeof window === "undefined") return "Sound is not available here.";
  if (!item.src && !synth()) return "This browser cannot speak words aloud.";
  if (!pickSource(item, installedVoices())) return `This device has no ${langLabel(item.lang)} voice.`;
  return null;
}

let station: HTMLAudioElement | null = null;
let ducked = 0;
const DUCK = 0.15;

export function stationAudio(): HTMLAudioElement {
  station ??= new Audio();
  station.preload = "none";
  return station;
}

let stationVolume = 1;

function duck(on: boolean): boolean {
  if (on) {
    if (!station || station.paused) return false;
    if (ducked === 0) stationVolume = station.volume;
    ducked += 1;
    station.volume = Math.min(stationVolume, DUCK);
    return true;
  }
  if (ducked === 0) return false;
  ducked -= 1;
  if (ducked === 0 && station) station.volume = stationVolume;
  return true;
}

function release() {
  const f = finish;
  finish = null;
  f?.();
}

export function stop() {
  token++;
  speaking = null;
  drop();
  synth()?.cancel();
  release();
  set(IDLE);
}

function speakWith(text: string, lang: string, voice: SpeechSynthesisVoice, done: () => void, started: () => void) {
  const s = synth();
  if (!s) return done();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice.lang || lang;
  u.voice = voice;
  u.rate = 0.85;
  u.onstart = started;
  u.onend = done;
  u.onerror = done;
  if (s.paused) s.resume();
  s.speak(u);
}

function playOne(item: SpeakItem, onStart: () => void = () => undefined): Promise<void> {
  const source = pickSource(item, installedVoices());
  return new Promise<void>((resolve) => {
    if (!source) return resolve();
    const started = onStart;
    let audio: HTMLAudioElement | null = null;
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      if (audio) {
        audio.onended = audio.onerror = null;
        audio.pause();
      }
      if (finish === done) finish = null;
      resolve();
    };
    finish = done;
    let fellBack = false;
    const fallback = () => {
      if (fellBack || settled) return;
      fellBack = true;
      if (source.voice) speakWith(item.text, item.lang, source.voice, done, started);
      else done();
    };
    if (source.kind === "voice") return speakWith(item.text, item.lang, source.voice, done, started);
    audio = sharedAudio();
    audio.src = source.src;
    audio.onended = done;
    audio.onplaying = started;
    audio.onerror = () => {
      if (audio) audio.onerror = null;
      fallback();
    };
    audio.play().catch(fallback);
  });
}

export const FINISH_MS = 1500;
export const CUT_GAP_MS = 60;
export const SETTLE_MS = 4000;

type Speaking = { t: number; startedAt: number | null; est: number };
let speaking: Speaking | null = null;
let pending: { item: SpeakItem; resolve: () => void } | null = null;

export function estimateMs(text: string): number {
  return Math.max(600, Array.from(text).length * 95);
}

function drop(): void {
  const p = pending;
  pending = null;
  p?.resolve();
}

export function cancelSpeech(): void {
  drop();
  stop();
}

let silentHooked = false;

export function play(item: SpeakItem): Promise<void> {
  if (!silentHooked) {
    silentHooked = true;
    subscribeSilent(() => isSilent() && cancelSpeech());
  }
  const now = Date.now();
  if (speaking?.startedAt != null && speaking.est - (now - speaking.startedAt) <= FINISH_MS) {
    drop();
    return new Promise<void>((resolve) => {
      pending = { item, resolve };
      const waiting = pending;
      setTimeout(() => {
        if (pending !== waiting) return;
        pending = null;
        token++;
        speaking = null;
        synth()?.cancel();
        release();
        void start(waiting.item, CUT_GAP_MS).then(resolve);
      }, SETTLE_MS);
    });
  }
  drop();
  const cut = speaking !== null;
  token++;
  synth()?.cancel();
  release();
  return start(item, cut ? CUT_GAP_MS : 0);
}

async function start(item: SpeakItem, gap: number): Promise<void> {
  const t = token;
  const reason = reasonFor(item);
  if (reason) {
    set({ id: item.id, all: false, notice: reason });
    await Promise.resolve();
    if (t === token) set({ id: null, all: false, notice: reason });
    return;
  }
  set({ id: item.id, all: false });
  if (gap) await new Promise((r) => setTimeout(r, gap));
  if (t !== token) return;
  speaking = { t, startedAt: null, est: estimateMs(item.text) };
  let began = false;
  const watch = setTimeout(() => {
    if (!began && t === token) set({ ...state, notice: "No sound yet. Check the volume and that the tab is not muted." });
  }, START_MS);
  const ducking = duck(true);
  try {
    await playOne(item, () => {
      began = true;
      if (speaking?.t === t) speaking.startedAt = Date.now();
      if (t === token && state.notice) set({ ...state, notice: null });
    });
  } finally {
    if (ducking) duck(false);
    clearTimeout(watch);
  }
  if (speaking?.t === t) speaking = null;
  const next = pending;
  if (next && t === token) {
    pending = null;
    token++;
    await start(next.item, 0);
    next.resolve();
    return;
  }
  if (t === token) set(state.notice ? { id: null, all: false, notice: state.notice } : IDLE);
}

export function say(text: string, lang: string, opts: { auto?: boolean; silent?: boolean; id?: string; src?: string } = {}): string | null {
  if (!text) return null;
  if (opts.auto && (opts.silent ?? isSilent())) return null;
  const item = { id: opts.id ?? `${lang}:${text}`, text, lang, src: opts.src };
  const reason = reasonFor(item);
  void play(item);
  return reason;
}

export async function playAll(items: SpeakItem[]) {
  stop();
  const t = token;
  for (const item of items) {
    if (t !== token) return;
    set({ id: item.id, all: true });
    await playOne(item);
    if (t === token) await new Promise((r) => setTimeout(r, 250));
  }
  if (t === token) set(IDLE);
}

export function toggle(item: SpeakItem, playing: boolean) {
  if (playing) stop();
  else void play(item);
}

export function clearNotice() {
  if (state.notice) set({ ...state, notice: null });
}

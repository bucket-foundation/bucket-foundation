export type SpeakItem = { id: string; text: string; lang: string; src?: string };
export type VoiceLike = { lang: string; name: string };
export type SpeakSource<V extends VoiceLike = VoiceLike> = { kind: "recording"; src: string; voice?: V } | { kind: "voice"; voice: V };

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

export type PlayerState = { id: string | null; all: boolean };

const IDLE: PlayerState = { id: null, all: false };
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

export function installedVoices(): SpeechSynthesisVoice[] {
  return synth()?.getVoices() ?? [];
}

export function stop() {
  token++;
  synth()?.cancel();
  const f = finish;
  finish = null;
  f?.();
  set(IDLE);
}

function speakWith(text: string, lang: string, voice: SpeechSynthesisVoice, done: () => void) {
  const s = synth();
  if (!s) return done();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice.lang || lang;
  u.voice = voice;
  u.rate = 0.85;
  u.onend = done;
  u.onerror = done;
  s.speak(u);
}

function playOne(item: SpeakItem): Promise<void> {
  const source = pickSource(item, installedVoices());
  return new Promise<void>((resolve) => {
    if (!source) return resolve();
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
      if (source.voice) speakWith(item.text, item.lang, source.voice, done);
      else done();
    };
    if (source.kind === "voice") return speakWith(item.text, item.lang, source.voice, done);
    audio = sharedAudio();
    audio.src = source.src;
    audio.onended = done;
    audio.onerror = () => {
      if (audio) audio.onerror = null;
      fallback();
    };
    audio.play().catch(fallback);
  });
}

export async function play(item: SpeakItem) {
  stop();
  const t = token;
  set({ id: item.id, all: false });
  await playOne(item);
  if (t === token) set(IDLE);
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

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


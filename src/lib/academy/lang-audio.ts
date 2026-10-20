export const AUDIO_BASE = "/academy-app/audio";

export function audioKey(lang: string, text: string): string {
  const s = `${lang}\u0000${text.normalize("NFC").trim()}`;
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
}

export function audioUrl(lang: string, text: string): string {
  return `${AUDIO_BASE}/${lang}/${audioKey(lang, text)}.mp3`;
}

export interface VoiceLike {
  lang: string;
  name?: string;
  localService?: boolean;
}

function norm(tag: string): string {
  return tag.toLowerCase().replace(/_/g, "-");
}

export function voiceTags(lang: string, bcp47: string): string[] {
  const base = norm(bcp47).split("-")[0];
  const extra: Record<string, string[]> = {
    zh: ["zh", "cmn"],
    he: ["he", "iw"],
    id: ["id", "in"],
    fa: ["fa", "pes"],
  };
  return Array.from(new Set([base, ...(extra[lang] ?? [])]));
}

export function pickVoice<V extends VoiceLike>(voices: readonly V[], lang: string, bcp47: string): V | null {
  const full = norm(bcp47);
  const exact = voices.find((v) => norm(v.lang) === full);
  if (exact) return exact;
  const tags = voiceTags(lang, bcp47);
  return voices.find((v) => tags.includes(norm(v.lang).split("-")[0])) ?? null;
}

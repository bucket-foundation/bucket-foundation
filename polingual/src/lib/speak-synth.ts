import { pickSource, type SpeakItem } from "./speak-voice";

export function synth(): SpeechSynthesis | undefined {
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

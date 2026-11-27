export const EMBED_CONSENT_KEY = "polingual-web/youtube-consent/v1";

export type VideoGate = "poster" | "asking" | "playing" | "declined";

export interface ConsentStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function browserStore(): ConsentStore | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function forgetConsent(store: ConsentStore | null): void {
  try {
    store?.removeItem(EMBED_CONSENT_KEY);
  } catch {
    return;
  }
}

export function storedConsent(store: ConsentStore | null): boolean {
  try {
    return store?.getItem(EMBED_CONSENT_KEY) === "allow";
  } catch {
    return false;
  }
}

export function rememberConsent(store: ConsentStore | null): void {
  try {
    store?.setItem(EMBED_CONSENT_KEY, "allow");
  } catch {
    return;
  }
}

export function onPoster(allowed: boolean): VideoGate {
  return allowed ? "playing" : "asking";
}

export function onAnswer(allow: boolean): VideoGate {
  return allow ? "playing" : "declined";
}

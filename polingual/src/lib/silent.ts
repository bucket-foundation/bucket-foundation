import { MUTE_KEY } from "./lobby/sound";

const listeners = new Set<() => void>();

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function isSilent(store: Storage | null = storage()): boolean {
  try {
    return store?.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSilent(on: boolean, store: Storage | null = storage()): void {
  try {
    store?.setItem(MUTE_KEY, on ? "1" : "0");
  } catch {
    return;
  }
  for (const l of listeners) l();
}

export function subscribeSilent(l: () => void): () => void {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => e.key === MUTE_KEY && l();
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

export const SOUND_KINDS: ReadonlySet<string> = new Set(["listen", "type-heard", "spell-heard", "speak"]);

export function needsSound(kind: string | undefined): boolean {
  return !!kind && SOUND_KINDS.has(kind);
}

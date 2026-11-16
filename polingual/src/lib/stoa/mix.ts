export type Mix = { music: boolean; voice: boolean; sfx: boolean };

const MIX_KEY = "stoa/mix/v1";

export function loadMix(fallback: Mix): Mix {
  try {
    const raw = localStorage.getItem(MIX_KEY);
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<Mix>) } : fallback;
  } catch {
    return fallback;
  }
}

export function saveMix(mix: Mix): void {
  try {
    localStorage.setItem(MIX_KEY, JSON.stringify(mix));
  } catch {
    return;
  }
}

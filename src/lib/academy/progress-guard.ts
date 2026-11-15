function keysOf(v: unknown): number {
  if (Array.isArray(v)) return v.length;
  if (v && typeof v === "object") return Object.keys(v).length;
  return 0;
}

export function progressWeight(data: unknown): number {
  if (!data || typeof data !== "object" || Array.isArray(data)) return 0;
  const d = data as Record<string, unknown>;
  const stats = (d.stats && typeof d.stats === "object" ? d.stats : {}) as Record<string, unknown>;
  const xp = typeof stats.xp === "number" && stats.xp > 0 ? 1 : 0;
  return keysOf(d.cards) + keysOf(d.prof) + keysOf(stats.history) + keysOf(d.systems) + keysOf(d.removed) + xp;
}

export function isBlankProgress(data: unknown): boolean {
  return progressWeight(data) === 0;
}

export function blankOverwrites(updates: Record<string, unknown>, existing: Record<string, unknown>): string[] {
  return Object.keys(updates).filter((b) => isBlankProgress(updates[b]) && b in existing && !isBlankProgress(existing[b]));
}

export function pushSettled(status: number): boolean {
  if (status === 409) console.error("academy progress: server refused a blank overwrite, entry dropped");
  return (status >= 200 && status < 300) || status === 409;
}

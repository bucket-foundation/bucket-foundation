const waiting = new Set<() => void>();

export function holdPendingSave(flush: () => void): () => void {
  waiting.add(flush);
  return () => void waiting.delete(flush);
}

export function flushPendingSaves(): void {
  for (const flush of [...waiting]) flush();
}

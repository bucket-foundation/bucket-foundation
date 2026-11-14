export type DeferredCard = { key: string; itemId: string; lang: string; kind: string; word: string };

const SOUND = new Set(["listen", "type-heard", "spell-heard", "speak"]);
let cards: DeferredCard[] = [];
const listeners = new Set<() => void>();

export function needsSound(kind: string | undefined): boolean {
  return !!kind && SOUND.has(kind);
}

export function deferCard(c: Omit<DeferredCard, "key">): boolean {
  const key = `${c.itemId}|${c.lang}|${c.kind}`;
  if (cards.some((x) => x.key === key)) return false;
  cards = [...cards, { ...c, key }];
  listeners.forEach((l) => l());
  return true;
}

export function deferredCards(): DeferredCard[] {
  return cards;
}

export function clearDeferred(): void {
  cards = [];
  listeners.forEach((l) => l());
}

export function subscribeDeferred(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

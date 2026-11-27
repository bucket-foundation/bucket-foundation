import { local } from "@/lib/storage";
import { readCard, writeCard, type PlayerCard } from "./card";

let current: PlayerCard | null = null;

export function setCurrentCard(card: PlayerCard): void {
  current = card;
  writeCard(local(), card);
}

export function currentCard(): PlayerCard | null {
  return current ?? readCard(local());
}

export function lastCard(): PlayerCard | null {
  return readCard(local());
}

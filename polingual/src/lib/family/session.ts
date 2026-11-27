import { local } from "@/lib/storage";
import { readCard, writeCard, type PlayerCard } from "./card";
import { kidSeat } from "./kid";

let current: PlayerCard | null = null;

export function setCurrentCard(card: PlayerCard): void {
  current = card;
  if (!kidSeat()) writeCard(local(), card);
}

export function currentCard(): PlayerCard | null {
  return current ?? (kidSeat() ? null : readCard(local()));
}

export function lastCard(): PlayerCard | null {
  return kidSeat() ? null : readCard(local());
}

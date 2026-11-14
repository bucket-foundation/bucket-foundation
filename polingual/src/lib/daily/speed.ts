import { fnv, mixed, SeededRandom } from "./rng";
import { balanced, wordId, type GameDeck, type GameWord } from "./words";

export const SPEED_SECONDS = 60;
export const SPEED_MISS_PENALTY = 2;
export const SPEED_HOT_COMBO = 5;

interface SpeedBoard {
  meanings: (GameWord | null)[];
  forms: (GameWord | null)[];
  pickedMeaning: string | null;
  pickedForm: string | null;
  points: number;
  hits: number;
  combo: number;
  bestCombo: number;
  missed: GameWord[];
  seen: GameWord[];
  next: number;
}

type SpeedOutcome = { kind: "picked" } | { kind: "matched"; word: GameWord } | { kind: "missed"; word: GameWord } | { kind: "ignored" };

export class Speed {
  board: SpeedBoard;
  private rng: SeededRandom;

  constructor(
    private deck: readonly GameWord[],
    seed: bigint,
    slots = 5
  ) {
    this.rng = new SeededRandom(seed);
    this.board = { meanings: Array(slots).fill(null), forms: Array(slots).fill(null), pickedMeaning: null, pickedForm: null, points: 0, hits: 0, combo: 0, bestCombo: 0, missed: [], seen: [], next: 0 };
    this.refill(true);
  }

  get playable(): boolean {
    return this.board.meanings.filter(Boolean).length >= 3;
  }

  private held(): GameWord[] {
    return [...this.board.meanings, ...this.board.forms].filter((w): w is GameWord => !!w);
  }

  private draw(avoid: GameWord[]): GameWord | null {
    if (!this.deck.length) return null;
    for (let n = 0; n < this.deck.length; n++) {
      const w = this.deck[this.board.next % this.deck.length];
      this.board.next += 1;
      const clash = avoid.some((h) => wordId(h) === wordId(w) || h.gloss.toLowerCase() === w.gloss.toLowerCase() || h.form.toLowerCase() === w.form.toLowerCase());
      if (!clash) return w;
    }
    return null;
  }

  private refill(force = false) {
    const b = this.board;
    const open = b.meanings.map((m, i) => (m ? -1 : i)).filter((i) => i >= 0);
    const live = b.meanings.length - open.length;
    if (!force && open.length < 2 && live > 1) return;
    const held = this.held();
    const fresh: GameWord[] = [];
    for (let n = 0; n < open.length; n++) {
      const w = this.draw(held);
      if (!w) break;
      held.push(w);
      fresh.push(w);
    }
    for (const w of fresh) if (!b.seen.some((s) => wordId(s) === wordId(w))) b.seen.push(w);
    mixed(open, this.rng).forEach((i, n) => {
      if (n < fresh.length) b.meanings[i] = fresh[n];
    });
    const gaps = b.forms.map((m, i) => (m ? -1 : i)).filter((i) => i >= 0);
    mixed(gaps, this.rng).forEach((i, n) => {
      if (n < fresh.length) b.forms[i] = fresh[n];
    });
  }

  tapMeaning(id: string): SpeedOutcome {
    if (!this.board.meanings.some((m) => m && wordId(m) === id)) return { kind: "ignored" };
    this.board.pickedMeaning = id;
    return this.resolve();
  }

  tapForm(id: string): SpeedOutcome {
    if (!this.board.forms.some((m) => m && wordId(m) === id)) return { kind: "ignored" };
    this.board.pickedForm = id;
    return this.resolve();
  }

  private resolve(): SpeedOutcome {
    const b = this.board;
    const m = b.pickedMeaning;
    const f = b.pickedForm;
    if (!m || !f) return { kind: "picked" };
    b.pickedMeaning = null;
    b.pickedForm = null;
    const word = b.meanings.find((x) => x && wordId(x) === m);
    if (!word) return { kind: "ignored" };
    if (m !== f) {
      b.combo = 0;
      if (!b.missed.some((x) => wordId(x) === m)) b.missed.push(word);
      return { kind: "missed", word };
    }
    b.hits += 1;
    b.combo += 1;
    b.bestCombo = Math.max(b.bestCombo, b.combo);
    b.points += b.combo >= SPEED_HOT_COMBO ? 2 : 1;
    b.meanings[b.meanings.findIndex((x) => x && wordId(x) === m)] = null;
    b.forms[b.forms.findIndex((x) => x && wordId(x) === m)] = null;
    this.refill();
    return { kind: "matched", word };
  }
}

export function speedDeck(deck: GameDeck, day: string, targets: readonly string[]): GameWord[] {
  const rng = new SeededRandom(fnv(`speed|${day}|${deck.root}|${[...targets].sort().join(",")}`));
  return balanced(targets.flatMap((l) => mixed(deck.pool(l).slice(0, 200), rng).slice(0, 12).map((e) => deck.word(e.itemId, l)!)));
}

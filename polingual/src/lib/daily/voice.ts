import type { LangCorpus } from "@academy/lang-systems";
import { fnv, mixed, SeededRandom } from "./rng";
import { flags, formOf, GameDeck, type GameWord } from "./words";

export function voicePrompts(corpus: LangCorpus, root: string, targets: string[], day: string) {
  const deck = new GameDeck(corpus, root, targets);
  const rng = new SeededRandom(fnv(`voice|${day}|${root}|${[...targets].sort().join(",")}`));
  const words: GameWord[] = targets.flatMap((l) => mixed(deck.pool(l).slice(0, 200), rng).slice(0, 6).map((e) => deck.word(e.itemId, l)!));
  return flags(words, targets, "voice", rng, (w, l) => {
    const item = corpus.byId.get(w.itemId);
    return l !== w.lang && !!item && formOf(item, l)?.toLowerCase() === w.form.toLowerCase();
  });
}

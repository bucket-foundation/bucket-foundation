import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dealer, fresh, playable, rng } from "@/lib/lobby/babel";
import { babelMeanings } from "@academy/babel";
import { flagTilesDeck } from "@academy/flag-tiles";
import { buildLangCorpus } from "@academy/lang-systems";
import { shiftBoard } from "@academy/shift";
import { buildBank } from "@/lib/polyword/bank";
import { dayNumber, puzzleFor } from "@/lib/polyword/puzzle";
import { atlasRounds } from "@academy/voice-atlas";
import { deckRoot } from "@academy/deck-root";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const read = (n: string) => JSON.parse(readFileSync(`${root}apple/Shared/Corpus/${n}`, "utf8"));
const corpus = buildLangCorpus(read("lang-core.json"), read("lang-cognates.json"), read("lang-phrases.json"), read("lang-layers.json"));
const meanings = ["dog", "cat", "sun", "sea", "tree"].map((m) => ({ id: m, meaning: m, forms: { es: `${m}-es`, fr: `${m}-fr`, de: `${m}-de` } }));
const board = shiftBoard(corpus.items, "2026-11-13")!;
const deck = flagTilesDeck(corpus.items, "2026-11-13");
const bank = buildBank(JSON.parse(readFileSync(`${root}polingual/src/data/words.json`, "utf8")));
const canon = Object.keys(bank.langs).sort().map((k) => `${k}=${bank.langs[k].join(",")}`).join(";");
const out = {
  babelFresh7: fresh(dealer(meanings, ["es", "fr", "de"], rng(7))).map((c) => `${c.meaning}:${c.lang}`),
  babelPlayable42: playable(dealer(meanings, ["es", "fr", "de"], rng(42))).map((c) => `${c.key}:${c.meaning}:${c.lang}`),
  babelMeanings: babelMeanings(corpus.items, ["es", "fr", "it"], 3).map((m) => m.id),
  shiftLangs: board.langs,
  shiftColumns: board.columns.map((c) => c.join("")),
  shiftTargets: board.targets.map((t) => `${t.lang}:${t.form}:${t.meaning}`),
  flagTilesLangs: deck.langs,
  flagTilesFirst: deck.tiles.slice(0, 8).map((t) => `${t.lang}:${t.form}`),
  polywordBankSha256: createHash("sha256").update(canon).digest("hex"),
  polywordEs13: puzzleFor(bank, "es", 13)!.slug,
  polywordFr40: puzzleFor(bank, "fr", 40)!.slug,
  polywordDay20270105: dayNumber(new Date(2027, 0, 5, 12)),
  polywordEs20270105: puzzleFor(bank, "es", dayNumber(new Date(2027, 0, 5, 12)))!.slug,
  shift20270105: shiftBoard(corpus.items, "2027-01-05")!.targets.map((t) => `${t.lang}:${t.form}`),
  flagTiles20270105: flagTilesDeck(corpus.items, "2027-01-05").tiles.slice(0, 8).map((t) => `${t.lang}:${t.form}`),
  deckRoots: ["es", "de", "la", "xx", "EN", ""].map((r) => deckRoot(r || null, corpus.items)),
  shiftEs: shiftBoard(corpus.items, "2026-11-13", "es")!.targets.map((t) => `${t.lang}:${t.form}:${t.meaning}`),
  flagTilesDe: (() => { const d = flagTilesDeck(corpus.items, "2026-11-13", "de"); return [d.langs.join(","), ...d.tiles.slice(0, 8).map((t) => `${t.lang}:${t.form}:${t.meaning}`)]; })(),
  atlasFr: atlasRounds(corpus.items, "2026-11-13", 6, "fr").map((r) => `${r.lang}:${r.itemId}:${r.meaning}`),
  atlas20270105: atlasRounds(corpus.items, "2027-01-05").map((r) => `${r.lang}:${r.itemId}`),
};
writeFileSync(`${root}android/polingual/src/test/resources/web-goldens.json`, JSON.stringify(out, null, 1) + "\n");

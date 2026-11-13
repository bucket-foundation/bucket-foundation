import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dealer, fresh, playable, rng } from "@/lib/lobby/babel";
import { babelMeanings } from "@academy/babel";
import { flagTilesDeck } from "@academy/flag-tiles";
import { buildLangCorpus } from "@academy/lang-systems";
import { shiftBoard } from "@academy/shift";
import { buildBank } from "@/lib/polyword/bank";
import { puzzleFor } from "@/lib/polyword/puzzle";

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
};
writeFileSync(`${root}android/polingual/src/test/resources/web-goldens.json`, JSON.stringify(out, null, 1) + "\n");

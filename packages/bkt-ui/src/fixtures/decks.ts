import type { DecksBody, WordSearch } from "../api";

export const NO_DECKS_BODY: DecksBody = { decks: [] };

export const DECKS_BODY: DecksBody = {
  decks: [
    { id: "polingual-es", title: "Spanish words", kind: "words", language: "es", languageName: "Spanish", cards: 755090, bytes: 96 * 1024 * 1024, version: "1f0c2ab49d31", source: "Wiktionary via Kaikki (kaikki.org)", licence: "CC-BY-SA 3.0", licenceHref: "https://creativecommons.org/licenses/by-sa/3.0/", curator: "Bucket Foundation", built: "2026-10-11", installed: true, path: "/data/bucket/decks/polingual-es" },
    { id: "polingual-ar", title: "Arabic words", kind: "words", language: "ar", languageName: "Arabic", cards: 24278, bytes: 5 * 1024 * 1024, version: "9ab31f0c2d44", source: "Wiktionary via Kaikki (kaikki.org)", licence: "CC-BY-SA 3.0", licenceHref: null, curator: "Bucket Foundation", built: "2026-10-11", installed: true, path: "/data/bucket/decks/polingual-ar" },
  ],
};

const hit = (lang: string, name: string, dir: "rtl" | "ltr", script: WordSearch["hits"][number]["script"], word: string, ipa: string, deck: string): WordSearch["hits"][number] => ({ lang, name, dir, script, word, ipa, pos: "noun", meaning: "water · body of water", href: deck === "open-ja" ? null : `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`, deck, source: deck === "open-ja" ? "Open Word List" : "Wiktionary via Kaikki (kaikki.org)", licence: deck === "open-ja" ? "CC0 1.0" : "CC-BY-SA 3.0" });

export const WORD_HITS: WordSearch = {
  query: "water",
  languages: 27,
  words: 780207,
  credits: [
    { deck: "polingual-es", title: "Spanish words", source: "Wiktionary via Kaikki (kaikki.org)", sourceHref: "https://kaikki.org", licence: "CC-BY-SA 3.0", licenceHref: "https://creativecommons.org/licenses/by-sa/3.0/", curator: "Bucket Foundation" },
    { deck: "bundled", title: "Words that came with Bucket", source: "Wiktionary via Kaikki (kaikki.org)", sourceHref: "https://kaikki.org", licence: "CC-BY-SA 3.0", licenceHref: "https://creativecommons.org/licenses/by-sa/3.0/", curator: null },
    { deck: "open-ja", title: "Japanese words", source: "Open Word List", sourceHref: null, licence: "CC0 1.0", licenceHref: null, curator: "Ada Example" },
  ],
  hits: [hit("es", "Spanish", "ltr", "latin", "agua", "ˈaɡwa", "polingual-es"), hit("ar", "Arabic", "rtl", "arabic", "ماء", "maːʔ", "polingual-ar"), hit("zh", "Chinese", "ltr", "han", "水", "ʂweɪ", "bundled"), hit("ja", "Japanese", "ltr", "kana", "みず", "", "open-ja")],
};

export const NO_WORD_HITS_BODY: WordSearch = { query: "qqq", languages: 27, words: 780207, credits: [], hits: [] };

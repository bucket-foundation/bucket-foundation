import type { ConceptPage, LessonPage, LessonWord, WordCredit, WordDecks, WordLessons, WordView } from "../api";

export const WORD_CREDIT: WordCredit = {
  text: "Words, definitions, IPA and etymology from Wiktionary via Kaikki (kaikki.org), CC-BY-SA 3.0. Full entries at en.wiktionary.org.",
  licence: "CC-BY-SA 3.0",
  licenceHref: "https://creativecommons.org/licenses/by-sa/3.0/",
  href: "https://en.wiktionary.org",
  sourceHref: "https://kaikki.org",
};

const view = (lang: string, name: string, dir: "rtl" | "ltr", script: WordView["script"], word: string, ipa: string, concept = "water"): WordView => ({
  lang,
  name,
  dir,
  script,
  concept,
  word,
  ipa,
  pos: "noun",
  meaning: concept,
  senses: [],
  etymology: "",
  href: `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`,
});

export const SCRIPT_WORDS: WordView[] = [
  view("ar", "Arabic", "rtl", "arabic", "ماء", "maːʔ"),
  view("he", "Hebrew", "rtl", "hebrew", "מים", "ˈma.jim"),
  view("fa", "Persian", "rtl", "arabic", "آب", "ɒːb"),
  view("zh", "Chinese", "ltr", "han", "水", "ʂweɪ"),
  view("ja", "Japanese", "ltr", "kana", "みず", "mizɯ"),
  view("ko", "Korean", "ltr", "hangul", "물", "mul"),
  view("hi", "Hindi", "ltr", "devanagari", "पानी", "pɑː.niː"),
  view("ta", "Tamil", "ltr", "tamil", "நீர்", "niːr"),
  view("th", "Thai", "ltr", "thai", "น้ำ", "náːm"),
];

const HAND: LessonWord = {
  ...view("de", "German", "ltr", "latin", "Hand", "hant", "hand"),
  meaning: "hand",
  senses: ["handwriting", "a side, such as the left hand"],
  etymology: "From Middle High German hant, from Old High German hant, from Proto-Germanic *handuz.",
  theme: "Body",
  others: [view("ar", "Arabic", "rtl", "arabic", "يد", "jad", "hand"), view("hi", "Hindi", "ltr", "devanagari", "हाथ", "ɦɑːt̪ʰ", "hand")],
};
const EYE: LessonWord = { ...view("de", "German", "ltr", "latin", "Auge", "ˈaʊ̯ɡə", "eye"), meaning: "eye", theme: "Body", others: [] };

const DECK = { id: "words-de", lang: "de", name: "German", dir: "ltr" as const, words: 37, lessons: 6, started: 2, due: 1 };

export const WORD_DECKS: WordDecks = { decks: [DECK, { id: "words-ar", lang: "ar", name: "Arabic", dir: "rtl", words: 29, lessons: 5, started: 0, due: 0 }], chosen: ["de", "ar", "hi"], credit: WORD_CREDIT };
export const NO_WORD_DECKS: WordDecks = { decks: [], chosen: [], credit: WORD_CREDIT };
export const WORD_LESSON_LIST: WordLessons = { deck: DECK, lessons: [{ n: 1, title: "Body", concepts: ["hand", "eye"], words: ["Hand", "Auge"], started: 2 }, { n: 2, title: "Mixed words", concepts: ["water"], words: ["Wasser"], started: 0 }], credit: WORD_CREDIT };
export const LESSON_PAGE: LessonPage & { credit: WordCredit } = { deck: DECK, n: 1, of: 2, title: "Body", words: [HAND, EYE], credit: WORD_CREDIT };
export const CONCEPT_PAGE: ConceptPage & { credit: WordCredit } = {
  page: 1,
  of: 2,
  concepts: 12,
  languages: [{ code: "de", name: "German", dir: "ltr" }, { code: "ar", name: "Arabic", dir: "rtl" }, { code: "hi", name: "Hindi", dir: "ltr" }],
  rows: [
    { concept: "hand", theme: "Body", pos: "noun", words: [HAND, HAND.others[0], HAND.others[1]] },
    { concept: "eye", theme: "Body", pos: "noun", words: [EYE, null, null] },
  ],
  credit: WORD_CREDIT,
};
export const NO_CONCEPTS: ConceptPage & { credit: WordCredit } = { page: 1, of: 1, concepts: 0, languages: [], rows: [], credit: WORD_CREDIT };
export const WORD_QUESTION = {
  id: "meaning-1",
  type: "meaning",
  prompt: 'Which German word means "hand"?',
  lines: [],
  choices: ["Hand", "Auge", "Wasser"],
  limitSec: 20,
  word: { lang: null, choicesLang: "de", credit: "Wiktionary via Kaikki (kaikki.org), CC-BY-SA 3.0", href: "https://en.wiktionary.org" },
};

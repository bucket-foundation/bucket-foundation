import { FACTS } from "./facts";
import { BILINGUAL_2009, MILTON_2010, SIMILARITY_2021 } from "./guide-sources";
import { wordHref, wordRows } from "./guide-words";
import type { Guide } from "./guides";
import { WORDS } from "./words";

const PLAY = { href: "/play", label: "Play the free word games" };
const APP_CTA = "Download on the App Store";

const SPANISH_FRENCH: Guide = {
  slug: "spanish-and-french-at-the-same-time",
  lang: "en",
  title: "Learning Spanish and French at the same time",
  description: "Can you learn Spanish and French at the same time? Yes. A table of shared words and a daily plan for studying both.",
  lede: "Spanish and French both descend from Latin, so many of their everyday words come in pairs. Studying the two side by side lets you learn each pair once and keep it in both languages.",
  sections: [
    {
      h: "Shared words",
      p: "Many numbers and food words match across the two languages. Each row links to a Polingual word page with the pronunciation of both forms.",
      table: {
        caption: "Spanish and French words from the same Latin source",
        head: ["Meaning", "Spanish", "French"],
        rows: wordRows(["hundred", "night", "hand", "bread", "wine", "moon", "sleep", "sad"], ["es", "fr"]),
      },
      more: [
        "Dormir and triste are spelled the same way in both languages and pronounced differently in each. Hearing the two back to back fixes them in memory as two separate sounds attached to one meaning.",
        "Pairs such as noche and nuit look further apart, and they follow a pattern. Latin ct turned into ch in Spanish and into it in French, and the same shift links ocho to huit and leche to lait.",
      ],
    },
    {
      h: "Words that differ",
      p: "Some common meanings use unrelated words. A table is mesa in Spanish and table in French. To eat is comer and manger, to speak is hablar and parler, and a woman is mujer and femme.",
      more: ["These words carry no shortcut from one language to the other, so give them extra repetitions. They are also the words that come out in the wrong language when you speak fast, which makes them good candidates for speaking practice."],
    },
    {
      h: "Mix-ups",
      p: "Swaps happen most between words that differ by a letter or an ending, such as cien and cent or mano and main. Treat each swap as a sign that the pair needs one more side by side look.",
      more: [
        "Polingual shows a meaning once with its Spanish and French words together, each with its own audio. You compare the spellings directly and say each word back, and Apple speech recognition checks what you said.",
        "Give each language its own cue outside the app as well. A Spanish podcast on the way to work and a French series in the evening tie each language to a time of day.",
      ],
    },
    {
      h: "A daily plan",
      p: "Keep one short session a day that touches both languages. In Polingual the words from both languages share one spaced review queue, so a single session reviews Spanish and French together.",
      more: [
        "Placement runs once per language. If your Spanish is ahead of your French, each language starts at its own level and the queue fills with the words you still need.",
        "Start with the paired words in the table, then add the words that differ in small batches. The queue schedules each review.",
      ],
    },
    {
      h: "A third Romance language",
      p: `A Polingual set holds up to ${FACTS.setLimit} languages. Italian and Portuguese come from the same Latin stock, so cien and cent gain cento and cem with little new effort. The cognates guide lists the patterns across all four.`,
    },
  ],
  links: [
    { href: wordHref("hundred"), label: "Hundred in every language" },
    { href: wordHref("night"), label: "Night in every language" },
    { href: "/learn/romance-cognates", label: "Cognates across the Romance languages" },
    PLAY,
  ],
  faq: [
    { q: "Can you learn Spanish and French at the same time?", a: "Yes. The two languages share Latin roots and many paired words. Keep the daily load small and review both languages in every session." },
    { q: "Will I confuse Spanish and French?", a: "Expect some swaps between look-alike words such as cien and cent. Seeing the pair together and saying each word aloud keeps the two apart." },
    { q: "Should I start both on the same day?", a: "You can. Placement in Polingual runs once per language, so a beginner in French and an intermediate speaker of Spanish each start at the right level." },
    { q: "Does Polingual teach Spanish and French together?", a: `Yes. Spanish and French are two of its ${FACTS.languageCount} languages, and both sit in one set with one review queue.` },
  ],
  cta: APP_CTA,
};

const THIRD_LANGUAGE: Guide = {
  slug: "third-language-for-spanish-english-bilinguals",
  lang: "en",
  pair: "tercer-idioma-para-bilingues",
  title: "A third language for Spanish and English bilinguals",
  description: "Which third language fits a Spanish and English speaker, with a word table for Portuguese, Italian, French and German.",
  lede: "A Spanish and English bilingual starts a third language with two vocabularies to draw on. Which language to pick depends on which of the two you want to lean on.",
  sections: [
    {
      h: "The bilingual head start",
      p: "In a 2009 Northwestern University study, sixty students learned words in an invented language. The bilingual groups, English and Spanish speakers and English and Mandarin speakers, mastered nearly twice as many words as the monolingual group.",
      more: ["The invented words resembled neither language the bilinguals knew, so the edge came from experience with learning words in two systems. A real third language adds a second edge: words that look like ones you already own."],
    },
    {
      h: "Shared vocabulary",
      p: "Each row links to a Polingual word page. Read across a row to see which of your two languages carries you into each new one.",
      table: {
        caption: "Six meanings in English, Spanish and four candidate third languages",
        head: ["English", "Spanish", "Portuguese", "Italian", "French", "German"],
        rows: wordRows(["water", "hand", "night", "milk", "book", "new"], ["es", "pt", "it", "fr", "de"]),
      },
      more: [
        "The Portuguese and Italian columns track the Spanish column row by row. French shares the same Latin stock with different spelling and sound, as in leche and lait.",
        "The German column tracks English instead: water and Wasser, hand and Hand, milk and Milch, book and Buch. A Spanish and English bilingual holds a key to both families.",
      ],
    },
    {
      h: "Four candidates",
      p: "Portuguese spelling stays close to Spanish, and its nasal vowels, as in mão, are new sounds for a Spanish speaker. Italian keeps its spelling close to its pronunciation, so reading and speaking grow together.",
      more: ["French rewards you twice, since English borrowed thousands of French words and Spanish shares its Latin roots. German is the pick when you want your English side to do the work and you want a language outside the Romance family."],
    },
    {
      h: "Learning through both languages",
      p: "Polingual shows each new word next to the Spanish and English words for the same meaning. A French learner sees lait with leche and milk, and a German learner sees Milch with the same pair.",
      more: [
        "The full interface is available in English and Spanish. Placement runs once per language, so you skip the words you already know in each one.",
        `A set holds up to ${FACTS.setLimit} languages from a list of ${FACTS.languageCount}, and every word in the set returns in one spaced review queue.`,
      ],
    },
    {
      h: "Review for familiar words",
      p: "Words that resemble a language you know stick fast and can fade fast. In a 2021 study, learners scored 34 on familiar-looking words and 16 on unfamiliar ones in the first session, on a 100 point scale. In the second session the gap narrowed to 22 and 18.",
      more: ["Put the look-alike words in the review queue with everything else. The early advantage gets you started and spaced review keeps the words."],
    },
  ],
  links: [
    { href: wordHref("water"), label: "Water in every language" },
    { href: wordHref("milk"), label: "Milk in every language" },
    { href: "/learn/romance-cognates", label: "Cognates across the Romance languages" },
    PLAY,
  ],
  sources: [BILINGUAL_2009, SIMILARITY_2021],
  faq: [
    { q: "What is the best third language for a Spanish and English bilingual?", a: "Portuguese and Italian share the most vocabulary with Spanish. French draws on both of your languages, and German builds on English." },
    { q: "Is a third language easier than a second?", a: "In a 2009 Northwestern University study, bilingual adults learned nearly twice as many invented words as monolingual adults." },
    { q: "Can I learn two new languages at once?", a: `Yes. A Polingual set holds up to ${FACTS.setLimit} languages, and all of them share one review queue.` },
    { q: "Is there a Spanish version of Polingual?", a: "Yes. The app runs in English and Spanish, and a Spanish version of this guide is on polingual.com." },
  ],
  cta: APP_CTA,
};

const CEFR_WORDS: Guide = {
  slug: "words-per-cefr-level",
  lang: "en",
  title: "How many words you need for each CEFR level",
  description: "Vocabulary size at each CEFR level from A1 to C2, taken from published test data, and how to plan a word count across two languages.",
  lede: "The CEFR sorts language ability into six levels from A1 to C2. Published test data puts A1 under 1,500 words and C2 near 5,000 of the most frequent words in a language.",
  sections: [
    {
      h: "Vocabulary size by level",
      p: "The CEFR describes vocabulary in phrases such as basic or broad and gives no word counts. James Milton of Swansea University reported counts for each level from learners who had passed the Cambridge exam at that level.",
      table: {
        caption: "Words known out of the 5,000 most frequent, by CEFR level",
        head: ["Level", "Words known", "CEFR vocabulary range"],
        rows: [
          ["A1", "Under 1,500", "A basic repertoire of isolated words and phrases"],
          ["A2", "1,500 to 2,500", "Enough for routine everyday transactions"],
          ["B1", "2,750 to 3,250", "Enough to talk about most topics of everyday life"],
          ["B2", "3,250 to 3,750", "A good range for your own field and most general topics"],
          ["C1", "3,750 to 4,500", "Good command of a broad repertoire"],
          ["C2", "4,500 to 5,000", "A broad repertoire with idioms and colloquial terms"],
        ],
      },
    },
    {
      h: "The test behind the numbers",
      p: "The counts come from XLex, a yes or no test that estimates how many of the 5,000 most frequent words in a language a learner knows. Each word counts as a lemma, a base form together with its regular inflections, so walk and walked count once.",
      more: ["The test tops out at 5,000, so the C2 row marks the ceiling of the test. The same chapter cites an estimate of 8,000 to 9,000 words overall for full comprehension of written texts."],
    },
    {
      h: "Variation between learners",
      p: "A second study in the chapter tested more than 500 learners of English and French, plus a group learning Greek. Average scores at A1 ran from 894 to 1,492 across the groups, and at B1 from 2,194 to 3,338.",
      more: ["In most groups vocabulary size explained 60 to 70 percent of the variation in CEFR level. Treat each row as a band. Grammar and speaking practice decide the rest of your level."],
    },
    {
      h: "A plan for two languages",
      p: "A2 starts at about 1,500 words. Two languages at A2 means about 3,000 words, and ten new words a day covers that in 300 days.",
      more: [
        "Related languages lower the count. Spanish noche and French nuit share one meaning and one Latin source, so learning the pair costs less than two unrelated words.",
        "Polingual reviews the words of every language in your set in one spaced queue. Placement runs once per language, so words you already know stay out of the count.",
      ],
    },
    {
      h: "Frequent words first",
      p: `The counts above measure the most frequent words, so start there. The Polingual word pages list ${WORDS.length} common words, each in up to ${FACTS.languageCount} languages with pronunciation.`,
      more: ["The word pages group them by theme, from numbers and family to food and verbs. The free games drill the same words in short rounds."],
    },
  ],
  links: [
    { href: "/word", label: `${WORDS.length} common words in every language` },
    { href: wordHref("water"), label: "Water in every language" },
    { href: wordHref("eat"), label: "Eat in every language" },
    PLAY,
  ],
  sources: [MILTON_2010],
  faq: [
    { q: "How many words do you need for A1?", a: "Under 1,500 of the 5,000 most frequent words, on the XLex data reported by Milton in 2010." },
    { q: "How many words do you need for B2?", a: "About 3,250 to 3,750 of the 5,000 most frequent words." },
    { q: "How many words do you need to be fluent?", a: "C2 learners scored 4,500 to 5,000 on a test of the 5,000 most frequent words. The same chapter cites 8,000 to 9,000 words overall for full comprehension of written texts." },
    { q: "Does the CEFR set an official word count?", a: "The framework describes vocabulary range in phrases and leaves counts to researchers. The figures here come from tests of learners at each level." },
  ],
  cta: APP_CTA,
};

const COGNATES: Guide = {
  slug: "romance-cognates",
  lang: "en",
  pair: "cognados-lenguas-romances",
  title: "Cognates across the Romance languages",
  description: "Spanish, French, Italian and Portuguese cognates from Latin, with word tables and the sound patterns that link them.",
  lede: "Spanish, French, Italian and Portuguese grew out of Latin. A word you know in one of them points to its relatives in the other languages.",
  sections: [
    {
      h: "One Latin word in four languages",
      p: "A cognate is a word that shares an ancestor with a word in another language. Each row links to a Polingual word page with the pronunciation of every form.",
      table: {
        caption: "Latin words and their descendants",
        head: ["Meaning", "Latin", "Spanish", "French", "Italian", "Portuguese"],
        rows: wordRows(["hand", "moon", "bread", "wine", "hundred", "sea", "wind", "new"], ["la", "es", "fr", "it", "pt"]),
      },
      more: ["Spanish and Italian keep the final vowel of the Latin stem in many words, as in mano and vino. French drops it, and Portuguese drops the n between vowels, which turns luna into lua."],
    },
    {
      h: "Sound patterns",
      p: "Some cognates look unrelated until you know the pattern. Latin ct, as in octo, became ch in Spanish, tt in Italian, and it in French and Portuguese. Latin cl and pl at the start of a word became ll in Spanish and ch in Portuguese.",
      table: {
        caption: "Two Latin sound patterns in four languages",
        head: ["Meaning", "Latin", "Spanish", "French", "Italian", "Portuguese"],
        rows: wordRows(["eight", "night", "milk", "key", "full", "rain"], ["la", "es", "fr", "it", "pt"]),
      },
      more: ["Once you know that Spanish ll matches Portuguese ch, lluvia and chuva read as one word, and lleno and cheio as another. Italian turns the same clusters into chi and pi, and French keeps them."],
    },
    {
      h: "Pairs inside the family",
      p: "The four languages also split into pairs. Spanish and Portuguese say comer for eating where French and Italian say manger and mangiare. The same split gives hablar and falar next to parler and parlare, and querer in both Iberian languages next to vouloir and volere.",
      more: ["Meanings can drift as well. Italian carta means paper, while Spanish and Portuguese carta means letter. Check the meaning of a look-alike the first time you meet it."],
    },
    {
      h: "Evidence on familiar words",
      p: "In a 2021 study, learners scored 34 on new words that resembled a language they knew and 16 on unfamiliar ones in the first session, on a 100 point scale. In the second session the gap narrowed to 22 and 18.",
      more: ["Cognates give you a fast start, and spaced review keeps them. Reviewing a cognate set together also shows you the small differences, such as the accent on Portuguese pão."],
    },
    {
      h: "Practice",
      p: `Polingual shows each meaning once with its word in every language of your set, and a set holds up to ${FACTS.setLimit} languages. Spanish, French, Italian and Portuguese fit in one set with one spaced review queue.`,
      more: ["The free games include Same word, which asks you to match one meaning across languages. The word pages show the forms of each word side by side."],
    },
  ],
  links: [
    { href: wordHref("night"), label: "Night in every language" },
    { href: wordHref("rain"), label: "Rain in every language" },
    { href: "/learn/spanish-and-french-at-the-same-time", label: "Learning Spanish and French at the same time" },
    PLAY,
  ],
  sources: [SIMILARITY_2021],
  faq: [
    { q: "What is a cognate?", a: "A word that shares an ancestor with a word in another language, such as Spanish noche and French nuit, which both come from Latin nox." },
    { q: "Does English have Romance cognates?", a: "Yes. English borrowed many words from French and Latin, so music, fruit, lion and minute match their Romance forms." },
    { q: "Do cognates always mean the same thing?", a: "Most do, and some drift. Italian carta means paper, while Spanish carta means letter." },
    { q: "How do I practice cognates?", a: "Study the related words as one set. Polingual shows a meaning with its word in each of your languages and reviews them in one queue." },
  ],
  cta: APP_CTA,
};

export const LONG_GUIDES: Guide[] = [SPANISH_FRENCH, THIRD_LANGUAGE, CEFR_WORDS, COGNATES];

import { FACTS, type Faq } from "./facts";

export type Guide = {
  slug: string;
  lang: "en" | "es";
  title: string;
  description: string;
  lede: string;
  sections: { h: string; p: string }[];
  faq: Faq[];
  cta: string;
};

export const GUIDES: Guide[] = [
  {
    slug: "learn-multiple-languages-at-once",
    lang: "en",
    title: "Learn multiple languages at once",
    description: "How to study two to six languages at the same time with one daily review, and the app built for it.",
    lede: "Studying several languages in parallel works when each day stays short and every language gets reviewed. Polingual puts them in one set and one queue.",
    sections: [
      { h: "One word, every language", p: "Polingual shows a meaning once, then its word in each language of your set, in that language's own script, with audio for each." },
      { h: "One review queue", p: "Words from all your languages share one spaced review queue, so a single short session keeps every language moving." },
      { h: "Roots that connect them", p: "Each word shows where it comes from. Spanish cien, Greek ἑκατόν and Sanskrit शतम् share a root, and seeing that link makes all three easier to keep." },
      { h: "Which languages", p: `${FACTS.languageCount} languages, from Spanish, French and Japanese to Hebrew, Hindi and Latin. Pick up to six in one set.` },
    ],
    faq: [
      { q: "Is it bad to learn two languages at once?", a: "It works when the daily load stays small and review covers every language. Pairing related languages, such as Spanish and Portuguese, lets each one reinforce the other." },
      { q: "How many languages can I study in Polingual?", a: "Up to six in one language set, from a list of 29." },
    ],
    cta: "Join the free beta",
  },
  {
    slug: "learn-spanish-and-french-together",
    lang: "en",
    title: "Learn Spanish and French together",
    description: "Study Spanish and French side by side: shared Latin roots, one review queue, and audio for every word.",
    lede: "Spanish and French come from Latin and share thousands of related words. Learning them side by side turns that overlap into a shortcut.",
    sections: [
      { h: "See both words at once", p: "Polingual shows each meaning with its Spanish and French words together, so cien and cent, or noche and nuit, stick as a pair." },
      { h: "Hear the difference", p: "Every word plays native audio, so you learn where the spellings match and the sounds part ways." },
      { h: "Add a third", p: "Italian or Portuguese join the same set and the same queue when you are ready." },
    ],
    faq: [
      { q: "Should I learn Spanish or French first?", a: "Either works. Studying both from the start lets the shared words carry over in both directions." },
      { q: "Will I mix them up?", a: "Seeing the two words next to each other helps you notice the differences instead of guessing." },
    ],
    cta: "Try it free on iPhone",
  },
  {
    slug: "learn-a-third-language",
    lang: "en",
    title: "Learn a third language when you are bilingual",
    description: "Already bilingual? Learn a third language through both of the languages you already speak.",
    lede: "Bilingual people already have two sets of words to hang a new language on. Polingual teaches the third through both.",
    sections: [
      { h: "Use what you know", p: "A Spanish and English speaker sees each French or Italian word next to the Spanish and English words for the same meaning." },
      { h: "Built for heritage speakers", p: "The full interface is in English and Spanish, and placement runs per language so you skip what you already know." },
    ],
    faq: [
      { q: "Is a third language easier for bilinguals?", a: "Bilinguals can link new words to two known languages, and related languages share many words." },
      { q: "Is there a Spanish version?", a: "Yes. The app and polingual.com/es are in Spanish." },
    ],
    cta: "Join the free beta",
  },
  {
    slug: "aprender-frances-sabiendo-espanol",
    lang: "es",
    title: "Aprende francés e italiano desde el español",
    description: "Si hablas español e inglés, aprende un tercer idioma con las palabras que ya conoces. Beta gratis para iPhone.",
    lede: "El español comparte raíces con el francés, el italiano y el portugués. Polingual te muestra cada palabra en todos tus idiomas a la vez.",
    sections: [
      { h: "Una palabra en todos tus idiomas", p: "Ves cada significado con su palabra en español, inglés y el idioma nuevo, con audio para cada una." },
      { h: "Un solo repaso al día", p: "Las palabras de todos tus idiomas comparten un mismo repaso, en una sesión corta." },
    ],
    faq: [
      { q: "¿Es más fácil el francés si hablo español?", a: "Sí, muchas palabras vienen del latín en los dos idiomas, como cien y cent." },
      { q: "¿La app está en español?", a: "Sí. Toda la app está en español y en inglés." },
    ],
    cta: "Únete a la beta gratis",
  },
];

export function guide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

import { FACTS, SITE, type Faq } from "./facts";
import type { GuideLink, Source } from "./guides";

export const COMPARE_CHECKED = "2026-11-19";

export type CompareRow = { topic: string; polingual: string; other: string };
export type Rival = {
  slug: string;
  name: string;
  title: string;
  description: string;
  lede: string;
  rows: CompareRow[];
  strengths: string[];
  otherFits: string;
  polingualFits: string;
  together: string;
  faq: Faq[];
  sources: Source[];
};

const POLINGUAL = {
  languages: `${FACTS.languageCount} languages, from Spanish and Japanese to Latin and Sanskrit`,
  together: `Up to ${FACTS.setLimit} languages in one set. Each meaning appears once with its word in every language of the set`,
  review: "One spaced review queue mixes every language in the set",
  speaking: "You hear each word and say it back, and Apple speech recognition checks it",
  platforms: `${FACTS.platforms}, with free word games in a browser at polingual.com/play`,
  price: FACTS.price,
};

const POLINGUAL_FITS = "You study two or more languages in the same season and want one short daily session for all of them. Each meaning arrives with its word in every language of your set, so related words such as noche and nuit reinforce each other, and one spaced queue schedules the reviews.";

function source(label: string, url: string): Source {
  return { label, url, checked: COMPARE_CHECKED };
}

const DUOLINGO: Rival = {
  slug: "duolingo",
  name: "Duolingo",
  title: "Polingual and Duolingo for two languages at once",
  description: "How Polingual and Duolingo each handle learning two or more languages at the same time, with sources for every Duolingo fact.",
  lede: "Duolingo lets you add a second course next to your first and keeps one streak across them. Polingual puts your languages in one set and teaches each meaning in all of them together.",
  rows: [
    { topic: "Languages", polingual: POLINGUAL.languages, other: "More than 100 courses that teach over 40 languages" },
    { topic: "Two or more languages", polingual: POLINGUAL.together, other: "You add a course from the flag menu. Removing a course deletes the progress made in that course" },
    { topic: "Daily rhythm", polingual: POLINGUAL.review, other: "A lesson in any course counts toward one shared streak" },
    { topic: "Lessons", polingual: POLINGUAL.speaking, other: "Units built around communication goals, taught in bite-sized lessons" },
    { topic: "Platforms", polingual: POLINGUAL.platforms, other: "iOS and Android apps, plus desktop" },
    { topic: "Price", polingual: POLINGUAL.price, other: "Courses are free with ads. Super Duolingo is a paid plan that removes ads" },
  ],
  strengths: [
    "Every Duolingo course is free to take. The company funds the free courses with ads and subscriptions.",
    "The catalog covers more than 40 languages, and you add a new course from the flag menu of the one you are in.",
    "One streak covers all your courses, so a day spent on either language keeps the habit alive.",
    "Duolingo publishes its own advice for learners of two languages. It suggests keeping the languages separate in your mind and your schedule, and its course structure follows that advice.",
  ],
  otherFits: "You want a free app on Android or iOS, a guided path in each language, and a clear line between your two languages. Separate courses give you that line by design.",
  polingualFits: POLINGUAL_FITS,
  together: "The two apps can work together: a Duolingo course for the vocabulary and grammar topics of each language, and a Polingual set that holds the shared words of all of them in one review.",
  faq: [
    { q: "Can you learn two languages at once on Duolingo?", a: "Yes. You add a second course from the flag menu, and lessons in either course count toward the same streak." },
    { q: "Does Duolingo show two languages side by side?", a: "Duolingo teaches each language as a course that you add from the flag menu. Polingual shows a meaning with its word in every language of your set." },
    { q: "Is Duolingo free?", a: "Duolingo says its courses are free for all learners, funded by ads and subscriptions. Super Duolingo is the paid plan without ads." },
    { q: "How much does Polingual cost?", a: `${FACTS.price}. The word games at polingual.com/play are free.` },
  ],
  sources: [
    source("Duolingo Blog: Duolingo 101", "https://blog.duolingo.com/duolingo-101-how-to-learn-a-language-on-duolingo/"),
    source("Duolingo Blog: How to add or remove a course", "https://blog.duolingo.com/add-new-course/"),
    source("Duolingo Blog: Is Duolingo free for all learners", "https://blog.duolingo.com/is-duolingo-free/"),
    source("Duolingo Blog: Can you learn multiple languages at once", "https://blog.duolingo.com/how-to-learn-multiple-languages/"),
  ],
};

const BABBEL: Rival = {
  slug: "babbel",
  name: "Babbel",
  title: "Polingual and Babbel for two languages at once",
  description: "How Polingual and Babbel each handle learning two or more languages at the same time, with sources for every Babbel fact.",
  lede: "Babbel teaches 14 languages through short lessons written by its own language experts, and its all-languages plans let you move between them. Polingual puts your languages in one set and reviews them together.",
  rows: [
    { topic: "Languages", polingual: POLINGUAL.languages, other: "14 languages" },
    { topic: "Two or more languages", polingual: POLINGUAL.together, other: "The All Languages plan gives access to the courses for every language. On the Group Plan each learner picks from 14 languages and switches at any time" },
    { topic: "Review", polingual: POLINGUAL.review, other: "A review system built into the app" },
    { topic: "Lessons", polingual: POLINGUAL.speaking, other: "Lessons built by more than 200 language experts, sized for as little as 10 minutes a day, with speech recognition for pronunciation" },
    { topic: "Platforms", polingual: POLINGUAL.platforms, other: "An iOS app and babbel.com" },
    { topic: "Price", polingual: POLINGUAL.price, other: "Paid plans for one language or for all languages. Current prices are on its App Store listing" },
  ],
  strengths: [
    "Babbel lessons are written by a team of more than 200 language experts, and each course is tailored to the native language of the learner.",
    "Babbel says you can learn in as little as 10 minutes a day, which suits a learner with a fixed daily slot.",
    "Speech recognition lets you practice pronunciation aloud inside a lesson.",
    "The Group Plan covers up to six people, each with an independent account and full access to all languages.",
  ],
  otherFits: "You want structured courses created by language experts, with pronunciation practice, and you are happy to study one language per sitting and switch when you choose.",
  polingualFits: POLINGUAL_FITS,
  together: "The two apps cover different jobs. A Babbel course gives you structured lessons in each language, and a Polingual set keeps the vocabulary of all your languages in one daily review.",
  faq: [
    { q: "Can you learn two languages at once on Babbel?", a: "Yes, on a plan that covers all languages. The App Store listing includes an All Languages plan, and Group Plan members can switch among 14 languages at any time." },
    { q: "How many languages does Babbel teach?", a: "14, according to its App Store listing and its Group Plan page." },
    { q: "Does Babbel have speech recognition?", a: "Yes. Its App Store listing describes practice out loud with speech recognition." },
    { q: "How much does Polingual cost?", a: `${FACTS.price}. The word games at polingual.com/play are free.` },
  ],
  sources: [
    source("App Store: Babbel", "https://apps.apple.com/us/app/babbel-language-learning/id829587759"),
    source("Babbel: Group Plan", "https://www.babbel.com/babbel-group-plan"),
    source("Babbel: home page", "https://www.babbel.com/"),
    source("Babbel press release: Group Plan", "https://www.babbel.com/press/en-us/releases/group-plan"),
  ],
};

const BUSUU: Rival = {
  slug: "busuu",
  name: "Busuu",
  title: "Polingual and Busuu for two languages at once",
  description: "How Polingual and Busuu each handle learning two or more languages at the same time, with sources for every Busuu fact.",
  lede: "Busuu offers 14 language courses and a community of fluent speakers who give feedback on your speaking and writing. Polingual puts your languages in one set and reviews them together.",
  rows: [
    { topic: "Languages", polingual: POLINGUAL.languages, other: "14 language courses" },
    { topic: "Two or more languages", polingual: POLINGUAL.together, other: "Its plans page lists access to all lessons, at all available levels, in 14 different languages" },
    { topic: "Feedback", polingual: POLINGUAL.speaking, other: "Fluent speakers in the Busuu Community give feedback on pronunciation and writing" },
    { topic: "Study tools", polingual: POLINGUAL.review, other: "Its plans page lists lesson downloads for learning anywhere" },
    { topic: "Platforms", polingual: POLINGUAL.platforms, other: "Apps on the App Store and Google Play" },
    { topic: "Price", polingual: POLINGUAL.price, other: "The basic version is free of charge. Premium and Premium Plus are paid plans" },
  ],
  strengths: [
    "The Busuu Community puts your speaking and writing in front of fluent speakers, who give you feedback.",
    "The basic version is free, so you can try a course before paying.",
    "The Busuu plans page lists access to all lessons, at all available levels, in 14 different languages, along with lesson downloads.",
    "Premium Plus adds conversation practice with instant feedback and exercises built from your own mistakes.",
  ],
  otherFits: "You want feedback from people who speak the language, full courses with levels, and lessons you can download.",
  polingualFits: POLINGUAL_FITS,
  together: "The two apps pair well. Busuu gives you course structure and human feedback in each language, and a Polingual set keeps the vocabulary of all your languages in one daily review.",
  faq: [
    { q: "Can you learn two languages at once on Busuu?", a: "The Busuu plans page lists access to all lessons, at all available levels, in 14 different languages." },
    { q: "Is Busuu free?", a: "The Busuu terms say the basic version can be accessed free of charge. Premium and Premium Plus are paid." },
    { q: "Does Busuu offer feedback from fluent speakers?", a: "Yes. Busuu says fluent speakers in its community give support on pronunciation and writing." },
    { q: "How much does Polingual cost?", a: `${FACTS.price}. The word games at polingual.com/play are free.` },
  ],
  sources: [
    source("Busuu: Premium plans", "https://www.busuu.com/en/premium-plans"),
    source("Busuu: home page", "https://www.busuu.com/en"),
    source("Busuu: mobile app", "https://www.busuu.com/en/mobile"),
    source("Busuu: Terms and Conditions", "https://www.busuu.com/en/terms"),
  ],
};

const LINGQ: Rival = {
  slug: "lingq",
  name: "LingQ",
  title: "Polingual and LingQ for two languages at once",
  description: "How Polingual and LingQ each handle learning two or more languages at the same time, with sources for every LingQ fact.",
  lede: "LingQ teaches through reading and listening to real content in 53 languages, and Premium members have access to all of them. Polingual puts your languages in one set and reviews their words together.",
  rows: [
    { topic: "Languages", polingual: POLINGUAL.languages, other: "53 languages" },
    { topic: "Two or more languages", polingual: POLINGUAL.together, other: "Premium gives access to all of its languages. You switch with the language button, and progress is saved for each language" },
    { topic: "Method", polingual: POLINGUAL.speaking, other: "A reader that translates words with a click, over a library of real content and material you import" },
    { topic: "Vocabulary", polingual: POLINGUAL.review, other: "A word tracker follows each word from first encounter to learned" },
    { topic: "Platforms", polingual: POLINGUAL.platforms, other: "iOS and Android apps, plus the web" },
    { topic: "Price", polingual: POLINGUAL.price, other: "A free plan with a limit of 20 on word and phrase lookups and 5 on imported lessons. Premium is paid, with prices on its pricing page" },
  ],
  strengths: [
    "LingQ supports 53 languages, and every one uses the same reader and the same word tracker.",
    "You learn from real content: the library, plus articles and podcasts you import yourself.",
    "The word tracker records each word from the first time you meet it until you know it.",
    "Premium members have access to all of the languages LingQ offers.",
  ],
  otherFits: "You like to read and listen, and you want to learn from articles and podcasts you choose, with word lookups one click away.",
  polingualFits: POLINGUAL_FITS,
  together: "The two apps fit different hours of the day. A Polingual set holds the core words of all your languages in one short review, and LingQ turns those words into reading and listening time in each language.",
  faq: [
    { q: "Can you learn two languages at once on LingQ?", a: "Yes. LingQ says Premium members have access to all of its languages, with progress saved for each language." },
    { q: "How many languages does LingQ have?", a: "53, according to its languages page." },
    { q: "Is LingQ free?", a: "LingQ has a free plan with the reader and word tracking, plus a set of lessons. It limits word and phrase lookups to 20 and imported lessons to 5." },
    { q: "How much does Polingual cost?", a: `${FACTS.price}. The word games at polingual.com/play are free.` },
  ],
  sources: [
    source("LingQ: languages", "https://www.lingq.com/en/languages/"),
    source("LingQ: pricing", "https://www.lingq.com/en/signup/"),
    source("LingQ forum FAQ: Can I learn more than one language at a time", "https://forum.lingq.com/t/can-i-learn-more-than-one-language-at-a-time/6883"),
    source("LingQ Blog: Can you learn multiple languages at the same time", "https://www.lingq.com/blog/learning-multiple-languages/"),
  ],
};

export const RIVALS: Rival[] = [DUOLINGO, BABBEL, BUSUU, LINGQ];

export const COMPARE_INDEX = {
  title: "Language apps for learning two languages at once",
  description: "Side by side pages on Polingual and Duolingo, Babbel, Busuu and LingQ for people learning two or more languages at once.",
  lede: "Duolingo, Babbel, Busuu and LingQ each let you study a second language next to your first. Polingual teaches your languages in one set with one review. Every fact about another app links to a page that company published.",
};

export const TRADEMARK_LINE = "Duolingo, Babbel, Busuu and LingQ are trademarks of their owners. Polingual is an independent app with no affiliation to them.";

export const COMPARE_LINKS: GuideLink[] = [
  { href: "/learn/learn-multiple-languages-at-once", label: "Learn multiple languages at once" },
  { href: "/learn/spanish-and-french-at-the-same-time", label: "Learning Spanish and French at the same time" },
  { href: "/word", label: "Common words in every language" },
  { href: "/play", label: "Play the free word games" },
];

export function rival(slug: string): Rival | undefined {
  return RIVALS.find((r) => r.slug === slug);
}

export function rivalPath(r: Rival): string {
  return `/compare/${r.slug}`;
}

export function comparePaths(): string[] {
  return ["/compare", ...RIVALS.map(rivalPath)];
}

export function compareBreadcrumbJsonLd(r?: Rival) {
  const items = [
    { name: "Polingual", item: `${SITE}/` },
    { name: "Compare", item: `${SITE}/compare` },
    ...(r ? [{ name: r.name, item: `${SITE}${rivalPath(r)}` }] : []),
  ];
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((x, i) => ({ "@type": "ListItem", position: i + 1, ...x })) };
}

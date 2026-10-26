import { TESTFLIGHT_URL } from "./beta";

export const SITE = "https://www.polingual.com";

export const FACTS = {
  name: "Polingual",
  platforms: "iPhone and iPad",
  languageCount: 29,
  publisher: "AGFarms LLC",
  testflight: TESTFLIGHT_URL,
};

export type Faq = { q: string; a: string };

export const FAQ: Faq[] = [
  { q: "What is Polingual?", a: `An app for ${FACTS.platforms} that teaches several languages at once. Each word returns in every language of your set, in one review queue.` },
  { q: "How many languages does Polingual teach?", a: `${FACTS.languageCount}, from Spanish and Japanese to Latin, Sanskrit and Old English.` },
  { q: "Can I study three languages at the same time?", a: "Yes. Pick a set such as Spanish, French and Italian. Placement runs once per language, then the words from all three share one spaced review queue." },
  { q: "How does Polingual check pronunciation?", a: "You hear each word and say it back. Apple speech recognition checks it." },
  { q: "How do I get Polingual?", a: "Polingual language systems run today in the Bucket app, in beta on TestFlight. Join the beta from polingual.com. The standalone Polingual app is not released yet." },
  { q: "Does Polingual work with Bucket?", a: "Yes. Sign in with the same email in both apps and your language progress syncs." },
];

export function appJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    name: FACTS.name,
    operatingSystem: "iOS",
    applicationCategory: "EducationalApplication",
    description: `Polingual teaches several languages at once on ${FACTS.platforms}. ${FACTS.languageCount} languages, one spaced review queue, spoken words with pronunciation checks.`,
    url: `${SITE}/`,
    image: `${SITE}/d8/icon-512.png`,
    publisher: { "@type": "Organization", name: FACTS.publisher },
    inLanguage: "en",
  };
}

export function faqJsonLd(items: Faq[] = FAQ) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

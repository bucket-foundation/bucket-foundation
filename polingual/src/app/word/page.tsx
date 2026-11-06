import type { Metadata } from "next";
import Link from "next/link";
import Legal from "../legal";
import styles from "./word.module.css";
import { appJsonLd, jsonLdScript, SITE, FACTS } from "@/lib/facts";
import { WORDS, capitalize, wordPath, wordsByTheme } from "@/lib/words";

const title = `${WORDS.length} words in ${FACTS.languageCount} languages`;
const description = `Common words from numbers to verbs, each in up to ${FACTS.languageCount} languages with native script and pronunciation. Browse by theme.`;

export const metadata: Metadata = {
  title: { absolute: `${title} | Polingual` },
  description,
  alternates: { canonical: "/word" },
  openGraph: { type: "website", title, description, url: "/word", images: [{ url: "/d8/og.png", width: 1200, height: 630 }] },
};

export default function Page() {
  const themes = wordsByTheme();
  const setLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "@id": `${SITE}/word`,
    name: "Polingual words",
    url: `${SITE}/word`,
    hasDefinedTerm: WORDS.map((w) => ({ "@type": "DefinedTerm", name: w.en, url: `${SITE}${wordPath(w)}` })),
  };
  return (
    <Legal>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript([setLd, appJsonLd()]) }} />
      <h1>{title}</h1>
      <p className="lede">{description}</p>
      <nav>
        <ul className={styles.chips}>
          {themes.map((t) => (
            <li key={t.id}><a href={`#${t.id}`}>{t.name}</a></li>
          ))}
        </ul>
      </nav>
      {themes.map((t) => (
        <section key={t.id} id={t.id} className={styles.theme}>
          <h2>{t.name}</h2>
          <ul className={styles.chips}>
            {t.words.map((w) => (
              <li key={w.slug}><Link href={wordPath(w)}>{capitalize(w.en)}</Link></li>
            ))}
          </ul>
        </section>
      ))}
      <a className={styles.cta} href="/?utm_source=seo&utm_campaign=word_index">Learn them all in one app</a>
    </Legal>
  );
}

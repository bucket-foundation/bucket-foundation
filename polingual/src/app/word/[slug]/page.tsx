import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Legal from "../../legal";
import { Tile, Tiles } from "../../tile";
import styles from "../word.module.css";
import { appJsonLd, jsonLdScript } from "@/lib/facts";
import { GUIDES } from "@/lib/guides";
import { LANGS, WORDS, breadcrumbJsonLd, capitalize, ctaHref, relatedWords, themeName, word, wordDescription, wordJsonLd, wordPath, wordTitle } from "@/lib/words";
import { pageMeta } from "@/lib/meta";
import { wordOgImage } from "@/lib/word-og";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return WORDS.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const w = word((await params).slug);
  if (!w) return {};
  const title = wordTitle(w);
  const description = wordDescription(w);
  const url = wordPath(w);
  return pageMeta({ path: url, title: `${capitalize(w.en)} in ${w.forms.length} languages`, documentTitle: title, description, type: "article", image: wordOgImage(w) });
}

export default async function Page({ params }: Props) {
  const w = word((await params).slug);
  if (!w) notFound();
  const name = capitalize(w.en);
  const related = relatedWords(w);
  const guides = GUIDES.filter((g) => g.lang === "en");
  return (
    <Legal wide>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript([wordJsonLd(w), breadcrumbJsonLd(w), appJsonLd()]) }} />
      <p className={styles.crumbs}><Link href="/word">Words</Link> / {themeName(w.category)}</p>
      <h1>{name} in {w.forms.length} languages</h1>
      {w.gloss !== w.en && <p className={styles.gloss}>{capitalize(w.gloss)}</p>}
      <p className="lede">The word {w.en} in {w.forms.length} languages, each in its own script, with IPA or a romanization where the data has one.</p>
      <Tiles>
        {w.forms.map((f) => {
          const l = LANGS[f.lang] ?? { name: f.lang, script: "" };
          const reading = [f.ipa ? `/${f.ipa}/` : "", f.kana, f.roman].filter(Boolean).join(" · ");
          return <Tile key={f.lang} lang={f.lang} code={f.lang} label={l.name} word={f.word} reading={reading} rtl={l.rtl} />;
        })}
      </Tiles>
      {(w.note || w.roots) && (
        <section>
          <h2>Roots</h2>
          {w.note && <p>{w.note}</p>}
          {w.roots && (
            <ul className={styles.roots}>
              {w.roots.map((r) => (
                <li key={r.root}>
                  <span className={styles.root}>{r.root}</span>{" "}
                  {r.langs.map((code) => {
                    const f = w.forms.find((x) => x.lang === code);
                    return f ? `${LANGS[code]?.name ?? code} ${f.word}` : LANGS[code]?.name ?? code;
                  }).join(", ")}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <div className={styles.ctaRow}>
        <a className={styles.cta} href={ctaHref(w)}>Learn {w.en} in your languages with Polingual</a>
      </div>
      <h2>Related words</h2>
      <ul className={styles.chips}>
        {related.map((r) => (
          <li key={r.slug}><Link href={wordPath(r)}>{capitalize(r.en)}</Link></li>
        ))}
      </ul>
      <h2>Guides</h2>
      <ul>
        {guides.map((g) => (
          <li key={g.slug}><Link href={`/learn/${g.slug}`}>{g.title}</Link></li>
        ))}
      </ul>
      <p>Words from Wiktionary via kaikki.org. IPA generated with eSpeak NG, pinyin with pinyin-pro and Japanese readings with Kuroshiro.</p>
    </Legal>
  );
}

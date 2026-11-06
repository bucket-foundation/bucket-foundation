import Link from "next/link";
import Site, { type SiteLocale } from "@/app/site";
import { Tile, Tiles } from "@/app/tile";
import styles from "./word.module.css";
import { HearAll, PlayTile } from "./Speak";
import { bcp47, commonsFileUrl, type SpeakItem } from "@/lib/speak";
import { appJsonLd, jsonLdScript, SITE } from "@/lib/facts";
import { GUIDES } from "@/lib/guides";
import { LANGS, WORDS, breadcrumbJsonLd, ctaHref, relatedWords, wordJsonLd, wordsByTheme, type Word } from "@/lib/words";
import { capitalizeIn, fill, langLabel, localIndexCopy, localPath, localWordCopy, localeInfo, orderedForms, strings, wordLocalPath } from "@/lib/word-i18n";

export function siteLocale(code: string): SiteLocale {
  const info = localeInfo(code);
  const s = strings(code);
  return { code, rtl: info.rtl, words: s.words, labels: info.labels, footer: { tagline: s.footerTagline, data: s.footerData, published: s.footerPublished } };
}

export function WordView({ w, code }: { w: Word; code: string }) {
  const s = strings(code);
  const copy = localWordCopy(code, w);
  const related = relatedWords(w);
  const guides = code === "en" ? GUIDES.filter((g) => g.lang === "en") : [];
  const forms = orderedForms(w, code);
  const items: SpeakItem[] = forms.map((f) => ({ id: f.lang, text: f.word, lang: bcp47(f.lang), src: f.audio?.src }));
  const recorded = forms.filter((f) => f.audio);
  const ld = code === "en" ? [wordJsonLd(w), breadcrumbJsonLd(w), appJsonLd()] : [appJsonLd()];
  return (
    <Site wide loc={siteLocale(code)}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }} />
      <p className={styles.crumbs}>
        <Link href={localPath(code, "/word")}>{s.words}</Link> / {s.themes[w.category] ?? w.category}
      </p>
      <h1>{copy.h1}</h1>
      {code === "en" && w.gloss !== w.en && <p className={styles.gloss}>{capitalizeIn(w.gloss, "en")}</p>}
      <p className="lede">{copy.intro}</p>
      <p>{copy.body.join(" ")}</p>
      <div className={styles.legendRow}>
        <p className={styles.legend}>
          {s.colLanguage} · {s.colWord} · {s.colPronunciation}
        </p>
        <HearAll items={items} label={s.hearAll} stopLabel={s.stop} />
      </div>
      <Tiles>
        {forms.map((f, i) => {
          const reading = [f.ipa ? `/${f.ipa}/` : "", f.kana, f.roman].filter(Boolean).join(" · ");
          return <Tile key={f.lang} lang={f.lang} code={f.lang} label={langLabel(f.lang, code)} word={f.word} reading={reading} rtl={LANGS[f.lang]?.rtl} index={i} play={<PlayTile item={items[i]} label={fill(s.listen, { word: f.word })} />} />;
        })}
      </Tiles>
      {recorded.length > 0 && (
        <p className={styles.audioCredit}>
          {s.audioCredit}{" "}
          {recorded.map(({ lang, word: text, audio }, i) => (
            <span key={lang}>
              {i > 0 && s.sep}
              <a href={commonsFileUrl(audio!.file)} lang={lang}>
                <bdi>{text}</bdi>
              </a>{" "}
              ({audio!.by && (
                <>
                  <bdi>{audio!.by}</bdi>,{" "}
                </>
              )}
              {audio!.licenseUrl ? <a href={audio!.licenseUrl}>{audio!.license}</a> : audio!.license})
            </span>
          ))}
        </p>
      )}
      {(w.note || w.roots) && (
        <section>
          <h2>{s.roots}</h2>
          {code === "en" && w.note && <p>{w.note}</p>}
          {w.roots && (
            <ul className={styles.roots}>
              {w.roots.map((r) => (
                <li key={r.root}>
                  <span className={styles.root}>{r.root}</span>{" "}
                  {r.langs
                    .map((lc) => {
                      const f = w.forms.find((x) => x.lang === lc);
                      return f ? `${langLabel(lc, code)} ${f.word}` : langLabel(lc, code);
                    })
                    .join(s.sep)}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <div className={styles.ctaRow}>
        <a className={styles.cta} href={code === "en" ? ctaHref(w) : `/${code}?utm_source=seo&utm_campaign=word_${w.slug}`}>{copy.cta}</a>
      </div>
      <h2>{s.related}</h2>
      <ul className={styles.chips}>
        {related.map((r) => (
          <li key={r.slug}>
            <Link href={wordLocalPath(code, r)}>{capitalizeIn(r.forms.find((f) => f.lang === code)?.word ?? r.en, code)}</Link>
          </li>
        ))}
      </ul>
      {guides.length > 0 && (
        <>
          <h2>Guides</h2>
          <ul>
            {guides.map((g) => (
              <li key={g.slug}><Link href={`/learn/${g.slug}`}>{g.title}</Link></li>
            ))}
          </ul>
        </>
      )}
      <p>{s.credits}</p>
    </Site>
  );
}

export function WordIndexView({ code }: { code: string }) {
  const s = strings(code);
  const copy = localIndexCopy(code);
  const themes = wordsByTheme();
  const setLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "@id": `${SITE}${localPath(code, "/word")}`,
    name: s.setName,
    inLanguage: localeInfo(code).hreflang,
    url: `${SITE}${localPath(code, "/word")}`,
    hasDefinedTerm: WORDS.map((w) => ({ "@type": "DefinedTerm", name: w.forms.find((f) => f.lang === code)?.word ?? w.en, url: `${SITE}${wordLocalPath(code, w)}` })),
  };
  return (
    <Site wide loc={siteLocale(code)}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript([setLd, appJsonLd()]) }} />
      <h1>{copy.title}</h1>
      <p className="lede">{copy.description}</p>
      <nav>
        <ul className={styles.chips}>
          {themes.map((t) => (
            <li key={t.id}><a href={`#${t.id}`}>{s.themes[t.id] ?? t.name}</a></li>
          ))}
        </ul>
      </nav>
      {themes.map((t) => (
        <section key={t.id} id={t.id} className={styles.theme}>
          <h2>{s.themes[t.id] ?? t.name}</h2>
          <ul className={styles.chips}>
            {t.words.map((w) => (
              <li key={w.slug}>
                <Link href={wordLocalPath(code, w)}>{capitalizeIn(w.forms.find((f) => f.lang === code)?.word ?? w.en, code)}</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <div className={styles.ctaRow}>
        <a className={styles.cta} href={`${code === "en" ? "/" : `/${code}`}?utm_source=seo&utm_campaign=word_index`}>{copy.cta}</a>
      </div>
    </Site>
  );
}

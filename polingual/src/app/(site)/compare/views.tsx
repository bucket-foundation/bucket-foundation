import Link from "next/link";
import Site from "@/app/site";
import { LinkList, SourceList } from "@/app/(site)/learn/views";
import { COMPARE_INDEX, COMPARE_LINKS, RIVALS, TRADEMARK_LINE, compareBreadcrumbJsonLd, rivalPath, type Rival } from "@/lib/compare";
import { APP_STORE_URL, appJsonLd, faqJsonLd, jsonLdScript } from "@/lib/facts";
import { Banner } from "@/ui";
import styles from "@/app/(site)/learn/guide.module.css";

function Footnotes() {
  return (
    <>
      <p data-testid="trademarks">{TRADEMARK_LINE}</p>
      <p><a href={APP_STORE_URL} rel="noopener">Download Polingual on the App Store</a></p>
    </>
  );
}

export function CompareIndexView() {
  return (
    <Site>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript([appJsonLd(), compareBreadcrumbJsonLd()]) }} />
      <Banner testId="compare-banner">
        <h1>{COMPARE_INDEX.title}</h1>
        <p className="lede">{COMPARE_INDEX.lede}</p>
      </Banner>
      {RIVALS.map((r) => (
        <section key={r.slug}>
          <h2><Link href={rivalPath(r)}>{r.title}</Link></h2>
          <p>{r.lede}</p>
        </section>
      ))}
      <section>
        <h2><Link href="/compare/duolingo-three-languages">Polingual and Duolingo for three languages</Link></h2>
        <p>A shorter table for a set of three languages.</p>
      </section>
      <LinkList title="Guides" links={COMPARE_LINKS} />
      <Footnotes />
    </Site>
  );
}

export function RivalView({ r }: { r: Rival }) {
  return (
    <Site>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript([appJsonLd(), compareBreadcrumbJsonLd(r), faqJsonLd(r.faq)]) }} />
      <Banner testId="compare-banner">
        <p><Link href="/compare">Compare</Link> / {r.name}</p>
        <h1>{r.title}</h1>
        <p className="lede">{r.lede}</p>
      </Banner>
      <div className={styles.scroll}>
        <table>
          <caption>Polingual and {r.name} side by side</caption>
          <thead>
            <tr><th></th><th scope="col">Polingual</th><th scope="col">{r.name}</th></tr>
          </thead>
          <tbody>
            {r.rows.map((row) => (
              <tr key={row.topic}><th scope="row">{row.topic}</th><td>{row.polingual}</td><td>{row.other}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>What {r.name} does well</h2>
      <ul>
        {r.strengths.map((s) => <li key={s}>{s}</li>)}
      </ul>
      <h2>When {r.name} fits</h2>
      <p>{r.otherFits}</p>
      <h2>When Polingual fits</h2>
      <p>{r.polingualFits}</p>
      <h2>Both apps together</h2>
      <p>{r.together}</p>
      <h2>Questions</h2>
      {r.faq.map((f) => (
        <section key={f.q}>
          <h3>{f.q}</h3>
          <p>{f.a}</p>
        </section>
      ))}
      <SourceList title="Sources" checked="checked" sources={r.sources} />
      <p>Polingual facts come from the app.</p>
      <LinkList title="Related pages" links={[...RIVALS.filter((x) => x !== r).map((x) => ({ href: rivalPath(x), label: x.title })), ...COMPARE_LINKS.slice(0, 1), ...COMPARE_LINKS.slice(3)]} />
      <Footnotes />
    </Site>
  );
}

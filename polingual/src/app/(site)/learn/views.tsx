import Link from "next/link";
import Site from "@/app/site";
import { siteLocale } from "@/app/(site)/word/views";
import { APP_STORE_URL, appJsonLd, faqJsonLd, jsonLdScript } from "@/lib/facts";
import { LOCAL_GUIDES, guidePair, guidePath, type Cell, type Guide, type GuideLink, type GuideTable, type Source } from "@/lib/guides";
import { Banner } from "@/ui";
import styles from "./guide.module.css";

const LABELS = {
  en: { questions: "Questions", related: "Related pages", sources: "Sources", checked: "checked", other: "Leer en español" },
  es: { questions: "Preguntas", related: "Páginas relacionadas", sources: "Fuentes", checked: "consultado el", other: "Read in English" },
};

function CellView({ cell }: { cell: Cell }) {
  return typeof cell === "string" ? <>{cell}</> : <Link href={cell.href}>{cell.text}</Link>;
}

export function DataTable({ table }: { table: GuideTable }) {
  return (
    <div className={styles.scroll}>
      <table>
        <caption>{table.caption}</caption>
        <thead>
          <tr>{table.head.map((h) => <th key={h} scope="col">{h}</th>)}</tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (j === 0 ? <th key={j} scope="row"><CellView cell={cell} /></th> : <td key={j}><CellView cell={cell} /></td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LinkList({ title, links }: { title: string; links: GuideLink[] }) {
  return (
    <>
      <h2>{title}</h2>
      <ul>
        {links.map((l) => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}
      </ul>
    </>
  );
}

export function SourceList({ title, checked, sources }: { title: string; checked: string; sources: Source[] }) {
  return (
    <>
      <h2>{title}</h2>
      <ul data-testid="sources">
        {sources.map((s) => <li key={s.url}><a href={s.url} rel="noopener nofollow">{s.label}</a>, {checked} {s.checked}</li>)}
      </ul>
    </>
  );
}

export function GuideView({ g }: { g: Guide }) {
  const t = LABELS[g.lang];
  const other = guidePair(g);
  return (
    <Site loc={LOCAL_GUIDES.includes(g) ? siteLocale(g.lang) : undefined}>
      <div lang={g.lang}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript([appJsonLd(), faqJsonLd(g.faq)]) }} />
        <Banner testId="guide-banner">
          <h1>{g.title}</h1>
          <p className="lede">{g.lede}</p>
        </Banner>
        {g.sections.map((s) => (
          <section key={s.h}>
            <h2>{s.h}</h2>
            <p>{s.p}</p>
            {s.table && <DataTable table={s.table} />}
            {s.more?.map((m) => <p key={m}>{m}</p>)}
          </section>
        ))}
        <h2>{t.questions}</h2>
        {g.faq.map((f) => (
          <section key={f.q}>
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </section>
        ))}
        {g.links && <LinkList title={t.related} links={g.links} />}
        {g.sources && <SourceList title={t.sources} checked={t.checked} sources={g.sources} />}
        {other && <p><Link href={guidePath(other)} hrefLang={other.lang} lang={other.lang}>{t.other}</Link></p>}
        <p><a href={APP_STORE_URL} rel="noopener">{g.cta}</a></p>
      </div>
    </Site>
  );
}

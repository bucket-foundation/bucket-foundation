import Link from "next/link";
import Site from "@/app/site";
import { siteLocale } from "@/app/(site)/word/views";
import { APP_STORE_URL, appJsonLd, faqJsonLd, jsonLdScript } from "@/lib/facts";
import { teachersBreadcrumbJsonLd, teachersCopy, teachersPath, type TeachersLang, type TeachersPage } from "@/lib/teachers";
import { Banner, ButtonLink } from "@/ui";
import PrintButton from "./PrintButton";
import styles from "./teachers.module.css";

function Shell({ lang, page, extra = [], children }: { lang: TeachersLang; page: TeachersPage; extra?: unknown[]; children: React.ReactNode }) {
  return (
    <Site loc={lang === "en" ? undefined : siteLocale(lang)}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript([appJsonLd(), teachersBreadcrumbJsonLd(lang, page), ...extra]) }} />
      {children}
    </Site>
  );
}

function Steps({ items }: { items: { h: string; p: string }[] }) {
  return (
    <ol className={styles.steps}>
      {items.map((s) => (
        <li key={s.h}>
          <h3>{s.h}</h3>
          <p>{s.p}</p>
        </li>
      ))}
    </ol>
  );
}

export function TeachersView({ lang }: { lang: TeachersLang }) {
  const c = teachersCopy(lang);
  return (
    <Shell lang={lang} page="" extra={[faqJsonLd(c.faq)]}>
      <Banner testId="teachers-banner">
        <h1>{c.title}</h1>
        <p className="lede">{c.lede}</p>
      </Banner>
      <div className={styles.cta}>
        <ButtonLink href="/live" data-testid="start-class-game">{c.start}</ButtonLink>
        <ButtonLink variant="secondary" href={APP_STORE_URL} rel="noopener" data-testid="teachers-app">{c.app}</ButtonLink>
      </div>
      <h2>{c.stepsTitle}</h2>
      <Steps items={c.steps} />
      <h2>{c.questionsTitle}</h2>
      <p>{c.questions}</p>
      <h2>{c.controlsTitle}</h2>
      {c.controls.map((s) => (
        <section key={s.h}>
          <h3>{s.h}</h3>
          <p>{s.p}</p>
        </section>
      ))}
      <h2>{c.printTitle}</h2>
      <ul>
        <li><Link href={teachersPath(lang, "/lesson-plan")}>{c.planLink}</Link></li>
        <li><Link href={teachersPath(lang, "/handout")}>{c.handoutLink}</Link></li>
      </ul>
      <h2>{c.appTitle}</h2>
      <p>{c.appBody} <a href={APP_STORE_URL} rel="noopener">{c.app}</a></p>
      <h2>{c.faqTitle}</h2>
      {c.faq.map((f) => (
        <section key={f.q}>
          <h3>{f.q}</h3>
          <p>{f.a}</p>
        </section>
      ))}
    </Shell>
  );
}

function Tools({ lang }: { lang: TeachersLang }) {
  const c = teachersCopy(lang);
  return (
    <div className={styles.tools}>
      <Link href={teachersPath(lang)}>{c.back}</Link>
      <PrintButton label={c.print} />
    </div>
  );
}

export function LessonPlanView({ lang }: { lang: TeachersLang }) {
  const p = teachersCopy(lang).plan;
  return (
    <Shell lang={lang} page="/lesson-plan">
      <Tools lang={lang} />
      <article className={styles.sheet} data-testid="lesson-plan">
        <h1>{p.title}</h1>
        <dl className={styles.facts}>
          {p.facts.map((f) => [<dt key={f.h}>{f.h}</dt>, <dd key={`${f.h}-d`}>{f.p}</dd>])}
        </dl>
        <h2>{p.beforeTitle}</h2>
        <ul>{p.before.map((b) => <li key={b}>{b}</li>)}</ul>
        <h2>{p.tableTitle}</h2>
        <table>
          <thead>
            <tr><th>{p.head.when}</th><th>{p.head.what}</th><th>{p.head.how}</th></tr>
          </thead>
          <tbody>
            {p.rows.map((r) => <tr key={r.when}><td>{r.when}</td><td>{r.what}</td><td>{r.how}</td></tr>)}
          </tbody>
        </table>
        <h2>{p.afterTitle}</h2>
        <ul>{p.after.map((b) => <li key={b}>{b}</li>)}</ul>
      </article>
    </Shell>
  );
}

const CODE_BOXES = [0, 1, 2, 3, 4, 5];
const WORD_ROWS = [0, 1, 2, 3, 4, 5];

export function HandoutView({ lang }: { lang: TeachersLang }) {
  const h = teachersCopy(lang).handout;
  return (
    <Shell lang={lang} page="/handout">
      <Tools lang={lang} />
      <article className={styles.sheet} data-testid="handout">
        <p className={styles.blank}>{h.name} <span className={styles.line} /></p>
        <h1>{h.title}</h1>
        <p>{h.lede}</p>
        <ol>{h.steps.map((s) => <li key={s}>{s}</li>)}</ol>
        <p className={styles.blank}>{h.code} <span className={styles.boxes}>{CODE_BOXES.map((i) => <span key={i} />)}</span></p>
        <p className={styles.blank}>{h.nickname} <span className={styles.line} /></p>
        <h2>{h.wordsTitle}</h2>
        <p>{h.wordsLede}</p>
        <table className={styles.write}>
          <thead>
            <tr>{h.head.map((x) => <th key={x}>{x}</th>)}</tr>
          </thead>
          <tbody>
            {WORD_ROWS.map((i) => <tr key={i}><td /><td /><td /></tr>)}
          </tbody>
        </table>
      </article>
    </Shell>
  );
}

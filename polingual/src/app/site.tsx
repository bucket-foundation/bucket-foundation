import Link from "next/link";
import { TESTFLIGHT_URL } from "@/lib/beta";
import { FLAG_STRIPE } from "@/lib/flags";
import styles from "./site.module.css";

export const SITE_FONTS =
  "https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Nunito:wght@400;700;800;900&family=Space+Mono:wght@400;700&family=Noto+Sans:wght@400;700&family=Noto+Sans+Arabic:wght@700&family=Noto+Sans+Hebrew:wght@700&family=Noto+Sans+Devanagari:wght@700&family=Noto+Sans+Tamil:wght@700&family=Noto+Sans+Thai:wght@700&family=Noto+Sans+JP:wght@700&family=Noto+Sans+KR:wght@700&display=swap";

export type SiteLocale = { code: string; rtl: boolean; words: string; labels: { beta: string; support: string; privacy: string; terms: string } };

export const EN_SITE: SiteLocale = { code: "en", rtl: false, words: "Words", labels: { beta: "Join the beta", support: "Support", privacy: "Privacy", terms: "Terms" } };

function home(code: string): string {
  return code === "en" ? "/" : `/${code}`;
}

function wordsHref(code: string): string {
  return code === "en" ? "/word" : `/${code}/word`;
}

export function SiteHeader({ loc = EN_SITE }: { loc?: SiteLocale }) {
  return (
    <header className={styles.hd}>
      <nav className={styles.nav}>
        <Link className={styles.brand} href={home(loc.code)}>
          <span className={styles.mark}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/d8/mark-pl.svg" alt="" width={38} height={38} />
          </span>
          polingual
        </Link>
        <Link className={styles.link} href={wordsHref(loc.code)}>{loc.words}</Link>
        <Link className={`${styles.link} ${styles.wide}`} href="/support">{loc.labels.support}</Link>
        <Link className={`${styles.link} ${styles.wide}`} href="/privacy">{loc.labels.privacy}</Link>
        <a className={`${styles.btn} ${styles.btnP}`} href={TESTFLIGHT_URL} rel="noopener">{loc.labels.beta}</a>
      </nav>
    </header>
  );
}

export function SiteFooter({ loc = EN_SITE }: { loc?: SiteLocale }) {
  return (
    <footer className={styles.ft}>
      <div className={styles.stripe} style={{ background: FLAG_STRIPE }} />
      <div className={styles.ftrow}>
        <span>Polingual · for iPhone and iPad</span>
        <nav className={styles.fl}>
          <Link href={wordsHref(loc.code)}>{loc.words}</Link>
          <Link href="/privacy">{loc.labels.privacy}</Link>
          <Link href="/terms">{loc.labels.terms}</Link>
          <Link href="/support">{loc.labels.support}</Link>
        </nav>
        <span>
          Word data: <a href="https://en.wiktionary.org">Wiktionary</a> via <a href="https://kaikki.org">Kaikki</a>, <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>. Published by AGFarms LLC.
        </span>
      </div>
    </footer>
  );
}

export default function Site({ children, wide = false, bare = false, loc = EN_SITE }: { children: React.ReactNode; wide?: boolean; bare?: boolean; loc?: SiteLocale }) {
  const body = bare ? <div className={styles.bare}>{children}</div> : <main className={wide ? styles.mainWide : styles.main}>{children}</main>;
  return (
    <div className={styles.site} lang={loc.code} dir={loc.rtl ? "rtl" : undefined}>
      <link rel="stylesheet" href={SITE_FONTS} precedence="default" />
      <SiteHeader loc={loc} />
      {body}
      <SiteFooter loc={loc} />
    </div>
  );
}

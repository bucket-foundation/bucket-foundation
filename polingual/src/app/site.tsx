import Link from "next/link";
import { TESTFLIGHT_URL } from "@/lib/beta";
import { FLAG_STRIPE } from "@/lib/flags";
import styles from "./site.module.css";

export const SITE_FONTS =
  "https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Nunito:wght@400;700;800;900&family=Space+Mono:wght@400;700&family=Noto+Sans:wght@400;700&family=Noto+Sans+Arabic:wght@700&family=Noto+Sans+Hebrew:wght@700&family=Noto+Sans+Devanagari:wght@700&family=Noto+Sans+Tamil:wght@700&family=Noto+Sans+Thai:wght@700&family=Noto+Sans+JP:wght@700&family=Noto+Sans+KR:wght@700&display=swap";

export function SiteHeader() {
  return (
    <header className={styles.hd}>
      <nav className={styles.nav}>
        <Link className={styles.brand} href="/">
          <span className={styles.mark}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/d8/mark-pl.svg" alt="" width={38} height={38} />
          </span>
          polingual
        </Link>
        <Link className={styles.link} href="/word">Words</Link>
        <Link className={`${styles.link} ${styles.wide}`} href="/support">Support</Link>
        <Link className={`${styles.link} ${styles.wide}`} href="/privacy">Privacy</Link>
        <a className={`${styles.btn} ${styles.btnP}`} href={TESTFLIGHT_URL} rel="noopener">Join the beta</a>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className={styles.ft}>
      <div className={styles.stripe} style={{ background: FLAG_STRIPE }} />
      <div className={styles.ftrow}>
        <span>Polingual · for iPhone and iPad</span>
        <nav className={styles.fl}>
          <Link href="/word">Words</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/support">Support</Link>
        </nav>
        <span>
          Word data: <a href="https://en.wiktionary.org">Wiktionary</a> via <a href="https://kaikki.org">Kaikki</a>, <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>. Published by AGFarms LLC.
        </span>
      </div>
    </footer>
  );
}

export default function Site({ children, wide = false, bare = false }: { children: React.ReactNode; wide?: boolean; bare?: boolean }) {
  return (
    <div className={styles.site}>
      <link rel="stylesheet" href={SITE_FONTS} precedence="default" />
      <SiteHeader />
      {bare ? <div className={styles.bare}>{children}</div> : <main className={wide ? styles.mainWide : styles.main}>{children}</main>}
      <SiteFooter />
    </div>
  );
}

import Link from "next/link";
import { APP_STORE_URL } from "@/lib/facts";
import { FlagBand } from "@/ui";
import styles from "./site.module.css";
import { ButtonLink } from "@/ui";
import FOOTER_LINKS from "@/lib/footer-links.json";

const SITE_FONTS =
  "https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Nunito:wght@400;700;800;900&family=Space+Mono:wght@400;700&family=Noto+Sans:wght@400;700&family=Noto+Sans+Arabic:wght@700&family=Noto+Sans+Hebrew:wght@700&family=Noto+Sans+Devanagari:wght@700&family=Noto+Sans+Tamil:wght@700&family=Noto+Sans+Thai:wght@700&family=Noto+Sans+JP:wght@700&family=Noto+Sans+KR:wght@700&display=swap";

export type SiteLocale = { code: string; rtl: boolean; words: string; labels: { app: string; support: string; privacy: string; terms: string; play: string; guides: string }; footer: { tagline: string; data: string; published: string } };

const EN_SITE: SiteLocale = { code: "en", rtl: false, words: "Words", labels: { app: "Get the app", support: "Support", privacy: "Privacy", terms: "Terms", play: "Play", guides: "Guides" }, footer: { tagline: "Polingual · for iPhone and iPad", data: "Word data:", published: "Published by AGFarms LLC." } };

function home(code: string): string {
  return code === "en" ? "/" : `/${code}`;
}

function wordsHref(code: string): string {
  return code === "en" ? "/word" : `/${code}/word`;
}

type FooterKey = "play" | "words" | "guides" | "privacy" | "terms" | "support" | "appstore";

export function footerLinks(loc: SiteLocale): { key: string; href: string; label: string }[] {
  const labels: Record<FooterKey, string> = { ...loc.labels, words: loc.words, appstore: "App Store" };
  return FOOTER_LINKS.map((l) => ({ key: l.key, href: l.key === "words" ? wordsHref(loc.code) : l.href, label: labels[l.key as FooterKey] }));
}

function SiteHeader({ loc = EN_SITE }: { loc?: SiteLocale }) {
  return (
    <header className={styles.hd}>
      <nav className={styles.nav}>
        <a className={styles.brand} href={home(loc.code)} aria-label="Polingual">
          <span className={styles.mark}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/d8/mark-pl.svg" alt="" width={38} height={38} />
          </span>
          <span className={styles.wordmark}>polingual</span>
        </a>
        <Link className={styles.link} href={wordsHref(loc.code)}>{loc.words}</Link>
        <Link className={styles.link} href="/play" data-testid="nav-play">{loc.labels.play}</Link>
        <Link className={`${styles.link} ${styles.wide}`} href="/support">{loc.labels.support}</Link>
        <ButtonLink size="sm" className={styles.btnP} href={APP_STORE_URL} rel="noopener">{loc.labels.app}</ButtonLink>
      </nav>
    </header>
  );
}

export function SiteFooter({ loc = EN_SITE }: { loc?: SiteLocale }) {
  return (
    <footer className={styles.ft}>
      <FlagBand flags />
      <div className={styles.ftrow}>
        <nav className={styles.fl} data-testid="footer-links">
          {footerLinks(loc).map((l) => (l.href.startsWith("/") ? <Link key={l.key} href={l.href}>{l.label}</Link> : <a key={l.key} href={l.href} rel="noopener">{l.label}</a>))}
        </nav>
        <span className={styles.credit}>
          {loc.footer.tagline} · {loc.footer.data} <a href="https://en.wiktionary.org">Wiktionary</a> · <a href="https://kaikki.org">Kaikki</a> · <a href="https://commons.wikimedia.org">Wikimedia Commons</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>. <span dir="auto">{loc.footer.published}</span>
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

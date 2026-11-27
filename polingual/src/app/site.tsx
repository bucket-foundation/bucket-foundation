import Link from "next/link";
import { APP_STORE_URL } from "@/lib/facts";
import { FlagBand } from "@/ui";
import styles from "./site.module.css";
import { ButtonLink } from "@/ui";
import FOOTER_LINKS from "@/lib/footer-links.json";

const SITE_FONTS =
  "https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Nunito:wght@400;700;800;900&family=Space+Mono:wght@400;700&family=Noto+Sans:wght@400;700&family=Noto+Sans+Arabic:wght@700&family=Noto+Sans+Hebrew:wght@700&family=Noto+Sans+Devanagari:wght@700&family=Noto+Sans+Tamil:wght@700&family=Noto+Sans+Thai:wght@700&family=Noto+Sans+JP:wght@700&family=Noto+Sans+KR:wght@700&display=swap";

export type SiteLocale = { code: string; rtl: boolean; words: string; labels: { app: string; support: string; privacy: string; terms: string; play: string; guides: string; teachers: string; nav: string; footerNav: string }; footer: { tagline: string; data: string; published: string } };

const EN_SITE: SiteLocale = { code: "en", rtl: false, words: "Words", labels: { app: "Get the app", support: "Support", privacy: "Privacy", terms: "Terms", play: "Play", guides: "Guides", teachers: "Teachers", nav: "Main", footerNav: "Footer" }, footer: { tagline: "Polingual · for iPhone and iPad", data: "Word data:", published: "Published by AGFarms LLC." } };

function home(code: string): string {
  return code === "en" ? "/" : `/${code}`;
}

function wordsHref(code: string): string {
  return code === "en" ? "/word" : `/${code}/word`;
}

type FooterKey = "play" | "words" | "guides" | "teachers" | "privacy" | "terms" | "support" | "appstore";

const GIFT: Record<string, { href: string; label: string }> = { en: { href: "/gift", label: "Gift" }, es: { href: "/es/gift", label: "Regalo" } };

export function giftFooterLink(code: string, env: Record<string, string | undefined> = process.env): { key: string; href: string; label: string } | null {
  return env.STRIPE_PRICE_POLINGUAL_GIFT_YEARLY?.trim() ? { key: "gift", ...(GIFT[code] ?? GIFT.en) } : null;
}

export function footerLinks(loc: SiteLocale, env: Record<string, string | undefined> = process.env): { key: string; href: string; label: string }[] {
  const labels: Record<FooterKey | "app" | "nav" | "footerNav", string> = { ...loc.labels, words: loc.words, appstore: "App Store" };
  const links = FOOTER_LINKS.map((l) => ({ key: l.key, href: l.key === "words" ? wordsHref(loc.code) : l.key === "teachers" && loc.code === "es" ? "/es/teachers" : l.href, label: labels[l.key as FooterKey] }));
  const gift = giftFooterLink(loc.code, env);
  const at = links.findIndex((l) => l.key === "privacy");
  return gift ? [...links.slice(0, at), gift, ...links.slice(at)] : links;
}

function SiteHeader({ loc = EN_SITE }: { loc?: SiteLocale }) {
  return (
    <header className={styles.hd}>
      <nav className={styles.nav} aria-label={loc.labels.nav}>
        <a className={styles.brand} href={home(loc.code)} aria-label="Polingual">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/kit/mark.svg" alt="" width={32} height={32} />
          <span className={styles.wordmark}>polingual</span>
        </a>
        <Link className={styles.link} href={wordsHref(loc.code)}>{loc.words}</Link>
        <Link className={styles.link} href="/play" data-testid="nav-play">{loc.labels.play}</Link>
        <Link className={`${styles.link} ${styles.wide}`} href="/support">{loc.labels.support}</Link>
        <ButtonLink variant="quiet" size="sm" className={styles.btnP} href={APP_STORE_URL} rel="noopener" data-testid="nav-app">{loc.labels.app}</ButtonLink>
      </nav>
    </header>
  );
}

export function SiteFooter({ loc = EN_SITE }: { loc?: SiteLocale }) {
  return (
    <footer className={styles.ft}>
      <FlagBand flags />
      <div className={styles.ftrow}>
        <nav className={styles.fl} aria-label={loc.labels.footerNav} data-testid="footer-links">
          {footerLinks(loc).map((l) => (l.href.startsWith("/") ? <Link key={l.key} prefetch={false} href={l.href}>{l.label}</Link> : <a key={l.key} href={l.href} rel="noopener">{l.label}</a>))}
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

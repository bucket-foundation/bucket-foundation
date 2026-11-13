import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import { Badge, ButtonLink, Card } from "@/ui";
import CopySwatch from "./CopySwatch";
import styles from "./brand.module.css";
import { AvatarSection, Components, Flags, Icons, Illustration, Motion, PLAY_VOICE, PlayColor, PlayDos, SideNav } from "./PlaySections";
import s from "./kit.module.css";
import { pageMeta } from "@/lib/meta";

export const metadata: Metadata = pageMeta({ path: "/brand", title: "Polingual Brand", description: "The Polingual brand: the Po mark, colors, type, word tiles, voice, app screens and a press kit download." });

const FONTS = "https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;700;800;900&family=Space+Mono:wght@400;700&family=Noto+Sans:wght@400;700&family=Noto+Sans+Hebrew:wght@700&family=Noto+Sans+Arabic:wght@700&family=Noto+Sans+Devanagari:wght@700&family=Noto+Sans+SC:wght@700&display=swap";

type Tile = { lang: string; word: string; ipa?: string; flag: string };

const NIGHT: Tile[] = [
  { lang: "SPANISH", word: "noche", ipa: "/ˈnotʃe/", flag: "linear-gradient(#AA151B 25%,#F1BF00 25% 75%,#AA151B 75%)" },
  { lang: "FRENCH", word: "nuit", ipa: "/nɥi/", flag: "linear-gradient(90deg,#0055A4 33%,#fff 33% 66%,#EF4135 66%)" },
  { lang: "GERMAN", word: "Nacht", ipa: "/naxt/", flag: "linear-gradient(#000 33%,#DD0000 33% 66%,#FFCE00 66%)" },
  { lang: "PORTUGUESE", word: "noite", ipa: "/ˈnojti/", flag: "linear-gradient(90deg,#046A38 40%,#DA291C 40%)" },
  { lang: "ITALIAN", word: "notte", flag: "linear-gradient(90deg,#009246 33%,#fff 33% 66%,#CE2B37 66%)" },
  { lang: "GREEK", word: "νύχτα", flag: "repeating-linear-gradient(#0D5EAF 0 11.1%,#fff 11.1% 22.2%)" },
  { lang: "RUSSIAN", word: "ночь", flag: "linear-gradient(#fff 33%,#0039A6 33% 66%,#D52B1E 66%)" },
  { lang: "HEBREW", word: "לילה", flag: "linear-gradient(#fff 12%,#0038B8 12% 22%,#fff 22% 78%,#0038B8 78% 88%,#fff 88%)" },
  { lang: "ARABIC", word: "ليل", flag: "linear-gradient(#CE1126 33%,#fff 33% 66%,#000 66%)" },
  { lang: "HINDI", word: "रात", flag: "linear-gradient(#FF9933 33%,#fff 33% 66%,#138808 66%)" },
  { lang: "CHINESE", word: "夜", flag: "#DE2910" },
  { lang: "JAPANESE", word: "夜", flag: "radial-gradient(circle,#BC002D 28%,#fff 29%)" },
];

const LOGOS = [
  { name: "Wordmark", file: "wordmark", bg: "#F6EEDC", ink: "#231F20", alt: "Po mark beside the word polingual" },
  { name: "Wordmark on tyrian", file: "wordmark-on-dark", bg: "#5B1A4A", ink: "#F6EEDC", alt: "Polingual wordmark in parchment" },
  { name: "Wordtype", file: "wordtype", bg: "#EBDDBE", ink: "#231F20", alt: "The word polingual in tyrian" },
  { name: "Po mark", file: "mark", bg: "#F6EEDC", ink: "#231F20", alt: "Po mark" },
  { name: "Po mark, keyline", file: "mark-on-dark", bg: "#3A0F2F", ink: "#F6EEDC", alt: "Po mark with a parchment keyline" },
  { name: "App icon", file: "app-icon-1024", bg: "#E9A23B", ink: "#231F20", alt: "Polingual app icon", png: true },
];

const PRIMARY = [
  { name: "Parchment", hex: "#F6EEDC", ink: "#231F20", role: "Page" },
  { name: "Tyrian", hex: "#5B1A4A", ink: "#F6EEDC", role: "Mark and bands" },
  { name: "Vermilion", hex: "#D9381E", ink: "#F6EEDC", role: "The one button" },
  { name: "Ink", hex: "#231F20", ink: "#F6EEDC", role: "Text" },
];

const GRAYS = [
  { name: "Ink", hex: "#231F20", ink: "#F6EEDC", role: "Text and outlines" },
  { name: "Tyrian deep", hex: "#3A0F2F", ink: "#F6EEDC", role: "Dark cards, TV stage" },
  { name: "Parchment 2", hex: "#EBDDBE", ink: "#231F20", role: "Cards" },
  { name: "Paper", hex: "#FFF8EA", ink: "#231F20", role: "Raised surfaces" },
];

const SUPPORT = [
  { name: "Ochre", hex: "#E9A23B", ink: "#231F20", role: "Streaks" },
  { name: "Lapis", hex: "#26428B", ink: "#F6EEDC", role: "Selection" },
  { name: "Malachite", hex: "#1E7A5A", ink: "#F6EEDC", role: "Correct" },
  { name: "Maya", hex: "#6FB7C2", ink: "#231F20", role: "Audio" },
  { name: "iOS accent", hex: "#3B5E2B", ink: "#F6EEDC", role: "System tint" },
  { name: "iOS accent dark", hex: "#8DB87A", ink: "#231F20", role: "Tint, dark mode" },
];

const TYPE = [
  { face: "Fredoka", meta: "Display · 600 to 700", sample: "3 days free", style: { fontFamily: "Fredoka, sans-serif", fontWeight: 700, fontSize: "clamp(40px,6vw,76px)", color: "#5B1A4A", lineHeight: 1 } },
  { face: "Nunito", meta: "Text · 400 to 900", sample: "Hear every word said and see its roots.", style: { fontFamily: "Nunito, sans-serif", fontSize: "clamp(20px,2.4vw,30px)" } },
  { face: "Space Mono", meta: "Labels · 700 · caps · 0.08em", sample: "SPANISH · 100 DAY STREAK", style: { fontFamily: "'Space Mono', monospace", fontWeight: 700, letterSpacing: "0.08em", fontSize: "15px" } },
  { face: "Noto Sans", meta: "Every native script", sample: "ἑκατόν · cien · сто", style: { fontFamily: "'Noto Sans', sans-serif", fontWeight: 700, fontSize: "clamp(22px,3vw,40px)" } },
];

const VOICE = [
  { ok: "After 100 days, expect to know 280 words across 4 languages.", no: "Master any language in record time!" },
  { ok: "Hear every word said and see its roots.", no: "An immersive, seamless language journey." },
  { ok: "Polingual teaches one word across many languages and scripts.", no: "Polingual is not just another flashcard app." },
  { ok: "3 days free, then $59.99 a year.", no: "Unlock premium learning today, risk-free!" },
];

const SCREENS = [
  { file: "1-onboarding", alt: "Onboarding: one word, night, in every language" },
  { file: "3-study", alt: "Study card: yes in Italian" },
  { file: "2-systems", alt: "Language systems" },
  { file: "4-placement", alt: "Placement test" },
  { file: "5-progress", alt: "Progress" },
  { file: "6-paywall", alt: "Paywall with yearly and monthly plans" },
];


const PRINCIPLES = [
  { t: "One word, every language", d: "A learner meets a meaning once and sees it in each sibling language, with sound and roots." },
  { t: "Numbers carry the claim", d: "Every promise on a screen comes from a simulation or a count we can show." },
  { t: "Play together", d: "Rooms, leagues and TV rounds turn practice into a game with friends." },
  { t: "Fund free science", d: "Proceeds go to Bucket Foundation, which keeps primary research free to read." },
];

const THREADS = [
  { t: "Families of languages", d: "Spanish, Italian and Portuguese share roots. Learn them side by side." },
  { t: "Every script", d: "Latin, Greek, Cyrillic, Hebrew, Arabic, Devanagari, Han and more, each in its own type." },
  { t: "Hear it said", d: "Native audio on every word and phrase." },
  { t: "Daily streaks", d: "Five new words a day per language, reviewed on an FSRS schedule." },
];

const TALKING = [
  "28 languages, 1,000 top words and 300 phrases each.",
  "After 100 days, expect to know 280 words across 4 languages.",
  "Party games play on a TV with phones as controllers.",
  "3 days free, then $59.99 a year.",
];

const TERMS = [
  { t: "Deck", d: "The set of words a learner is studying across every chosen language." },
  { t: "Tile", d: "One word in one language: flag, word, label and IPA." },
  { t: "Streak", d: "Days in a row with at least one finished session." },
  { t: "League", d: "The weekly tier a player competes in, from Parchment to Gold." },
];

const MISUSE = [
  { label: "Low contrast background", bg: "#3A0F2F", src: "mark", style: {} },
  { label: "Unapproved colors", bg: "#F6EEDC", src: "mark", style: { filter: "hue-rotate(120deg)" } },
  { label: "Mark on vermilion", bg: "#D9381E", src: "mark", style: {} },
  { label: "Stretched", bg: "#EBDDBE", src: "wordtype", style: { transform: "scaleX(1.5) scaleY(.7)" } },
  { label: "Rotated", bg: "#F6EEDC", src: "wordmark", style: { transform: "rotate(-18deg)" } },
  { label: "Effects", bg: "#F6EEDC", src: "wordmark", style: { filter: "blur(1px) drop-shadow(4px 4px 4px #D9381E)" } },
];

const AVOID = [
  { ok: true, label: "Fredoka title, Nunito body", style: { fontFamily: "Fredoka", fontWeight: 700 } },
  { ok: false, label: "Tight letter spacing", style: { fontFamily: "Fredoka", fontWeight: 700, letterSpacing: "-0.12em" } },
  { ok: false, label: "Wide letter spacing", style: { fontFamily: "Fredoka", fontWeight: 700, letterSpacing: "0.4em" } },
  { ok: false, label: "Display type in all caps", style: { fontFamily: "Fredoka", fontWeight: 700, textTransform: "uppercase" as const } },
  { ok: false, label: "Every Word Capitalized", style: { fontFamily: "Fredoka", fontWeight: 700, textTransform: "capitalize" as const } },
  { ok: false, label: "Mixed typefaces", style: { fontFamily: "Georgia, serif", fontStyle: "italic" } },
];

const DOWNLOADS = [
  { name: "Press kit", meta: "ZIP · logos, screens, share image, facts", href: "/brand/polingual-press-kit.zip" },
  { name: "Po mark", meta: "SVG", href: "/brand/kit/mark.svg" },
  { name: "Po mark, keyline", meta: "SVG", href: "/brand/kit/mark-on-dark.svg" },
  { name: "Wordmark", meta: "SVG", href: "/brand/kit/wordmark.svg" },
  { name: "Wordmark on tyrian", meta: "SVG", href: "/brand/kit/wordmark-on-dark.svg" },
  { name: "Wordtype", meta: "SVG", href: "/brand/kit/wordtype.svg" },
  { name: "App icon", meta: "PNG 1024", href: "/brand/kit/app-icon-1024.png" },
  { name: "D8 mark, Po", meta: "SVG", href: "/d8/mark-pl.svg" },
  { name: "D8 mark, alternate", meta: "SVG", href: "/d8/mark-d8.svg" },
  { name: "Share image", meta: "JPG 1200 by 630", href: "/brand/og.jpg" },
];

function Sub({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.sub}>
      <div className={styles.subHead}>
        <h3 className={styles.h3}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Dl({ href, children = "Download" }: { href: string; children?: ReactNode }) {
  return <ButtonLink href={href} download variant="secondary" size="sm">{children}</ButtonLink>;
}

function TileView({ t }: { t: Tile }) {
  return (
    <div className={styles.tile} style={{ ["--flag" as string]: t.flag }}>
      <s>{t.lang}</s>
      <b>{t.word}</b>
      {t.ipa ? <i>{t.ipa}</i> : null}
    </div>
  );
}

export default function BrandPage() {
  return (
    <main className={styles.page} id="top">
      <link rel="stylesheet" href={FONTS} precedence="default" />
      <div className={styles.wrap}>
        <header className={styles.top}>
          <Image src="/brand/kit/wordmark.svg" alt="Polingual" width={240} height={80} unoptimized priority />
          <ButtonLink href="/" variant="quiet" size="sm">polingual.com</ButtonLink>
        </header>
      </div>

      <section className={styles.hero}>
        <div className={`${styles.wrap} ${styles.heroGrid}`}>
          <div>
            <div className={styles.label}>Brand guidelines</div>
            <h1 className={styles.heroTitle}>
              Language learning for <span>multilingual</span> learners.
            </h1>
            <p className={styles.lede}>The mark, colors, type, icons, tiles and voice behind Polingual. Use this guide when you write about us, design for us or build on the app.</p>
            <div className={styles.ctaRow}>
              <ButtonLink href="/brand/polingual-press-kit.zip" download size="lg">
                Download full brand kit
              </ButtonLink>
              <ButtonLink href="#logo" variant="secondary" size="lg">
                Logo files
              </ButtonLink>
            </div>
          </div>
          <div className={styles.tiles}>
            {NIGHT.slice(0, 8).map((t) => (
              <TileView key={t.lang} t={t} />
            ))}
          </div>
        </div>
        <div className={styles.heroFoot} />
      </section>

      <SideNav />

      <section id="intro" className={`${styles.section} ${styles.band}`} style={{ paddingTop: 24 }}>
        <div className={styles.wrap}>
          <div className={styles.label}>01 · Introduction</div>
          <h2 className={styles.h2}>One deck, many languages</h2>
          <div className={styles.subGrid}>
            <Sub title="Mission">
              <p>Help people learn <strong>a family of languages at once</strong>, so every new word lands in each language they care about.</p>
            </Sub>
            <Sub title="What is Polingual?">
              <p>A study app and party game. Polingual teaches a word once and shows it in every sibling language, <strong>with its sound and its roots</strong>.</p>
            </Sub>
            <Sub title="Origin">
              <p>Polingual comes from the team behind Bucket Foundation. Proceeds fund Bucket&apos;s free science.</p>
            </Sub>
            <Sub title="Who are we building for?">
              <p>Heritage speakers, travelers, families with two or more home languages and anyone who wants more than one language at a time.</p>
            </Sub>
          </div>
          <div className={`${styles.stat}`} style={{ marginTop: 40 }}>
            <div>
              <p className={styles.statLine}>
                After 100 days, expect to know <span>280 words</span> across <span>4 languages</span>, and remember <span>95%</span> of them.
              </p>
              <p className={styles.note}>Simulation: FSRS scheduler, 4 languages, 5 new words a day per language, 14 cards a session, 8 runs. Mean 283.6 words, 95.3% retained. polingual/scripts/sim_100_days.ts</p>
            </div>
            <div className={styles.nums}>
              {[["28", "languages"], ["1,000", "top words per language"], ["300", "phrases per language"], ["100", "day streak goal"]].map(([n, l]) => (
                <div key={l} className={styles.num}>
                  <div className={styles.numN}>{n}</div>
                  <div className={styles.numL}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="principles" className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.label}>02 · Culture</div>
          <h2 className={styles.h2}>Principles</h2>
          <ol className={styles.numbered}>
            {PRINCIPLES.map((p) => (
              <li key={p.t}><strong>{p.t}.</strong> {p.d}</li>
            ))}
          </ol>
        </div>
      </section>

      <section id="language" className={styles.section} style={{ paddingTop: 0 }}>
        <div className={styles.wrap}>
          <div className={styles.label}>03 · Language</div>
          <h2 className={styles.h2}>Say it once, plainly</h2>
          <Sub title="Narrative threads">
            <ol className={styles.numbered}>
              {THREADS.map((p) => (
                <li key={p.t}><strong>{p.t}.</strong> {p.d}</li>
              ))}
            </ol>
          </Sub>
          <Sub title="Talking points">
            <ul className={styles.checks}>
              {TALKING.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </Sub>
          <Sub title="Words we use">
            <ol className={styles.numbered}>
              {TERMS.map((p) => (
                <li key={p.t}><strong>{p.t}.</strong> {p.d}</li>
              ))}
            </ol>
          </Sub>
          <Sub title="Voice and tone">
            <p className={styles.lede}>Polingual sounds <strong>warm, specific and short</strong>. Lead with what the learner gets. Numbers carry the claim. No dashes, no hype, no comparisons with rivals.</p>
          </Sub>
          <Sub title="Do and don't">
            <div className={styles.voiceGrid}>
              {[...VOICE, ...PLAY_VOICE].map((v) => (
                <Card key={v.ok} tone="tyrian">
                  <Badge tone="malachite">WRITE</Badge>
                  <div className={styles.pairText}>{v.ok}</div>
                  <Badge tone="vermilion">NEVER</Badge>
                  <div className={`${styles.pairText} ${styles.strike}`}>{v.no}</div>
                </Card>
              ))}
            </div>
          </Sub>
        </div>
      </section>

      <section id="logo" className={`${styles.section} ${styles.band}`}>
        <div className={styles.wrap}>
          <div className={styles.label}>04 · Logo</div>
          <h2 className={styles.h2}>The Po square</h2>
          <Sub title="Brandmark" action={<Dl href="/brand/kit/mark.svg">Brandmark SVG</Dl>}>
            <p>A tyrian rounded square with a parchment Po and a vermilion dot. Use it where space is tight: app icons, avatars, favicons.</p>
            <div className={styles.markStage}>
              <Image src="/brand/kit/mark.svg" alt="Po mark" width={180} height={180} unoptimized />
              <Image src="/d8/mark-pl.svg" alt="Po mark, landing version" width={180} height={180} unoptimized />
            </div>
          </Sub>
          <Sub title="Lockup" action={<Dl href="/brand/kit/wordmark.svg">Lockup SVG</Dl>}>
            <p>The wordmark sets polingual in lowercase Nunito Black beside the mark. Use ink on light grounds and parchment on dark grounds.</p>
            <div className={styles.logoGrid}>
              {LOGOS.filter((l) => !l.png).map((l) => (
                <div key={l.file} className={styles.logoCard} style={{ background: l.bg, color: l.ink }}>
                  <Image src={`/brand/kit/${l.file}.svg`} alt={l.alt} width={360} height={120} unoptimized />
                  <div className={styles.logoName}>{l.name}</div>
                  <div className={styles.dl}>
                    <Dl href={`/brand/kit/${l.file}.svg`}>SVG</Dl>
                    <Dl href={`/brand/kit/${l.file}.png`}>PNG</Dl>
                  </div>
                </div>
              ))}
            </div>
          </Sub>
          <Sub title="Color">
            <div className={styles.logoGrid}>
              {[["#F6EEDC", "wordmark", "#231F20"], ["#E9A23B", "wordmark", "#231F20"], ["#26428B", "wordmark-on-dark", "#F6EEDC"], ["#1E7A5A", "wordmark-on-dark", "#F6EEDC"]].map(([bg, f, ink]) => (
                <div key={bg} className={styles.logoCard} style={{ background: bg, color: ink }}>
                  <Image src={`/brand/kit/${f}.svg`} alt={`Wordmark on ${bg}`} width={300} height={100} unoptimized />
                  <code className={styles.swHex}>{bg}</code>
                </div>
              ))}
            </div>
          </Sub>
          <Sub title="App icon and avatars" action={<Dl href="/brand/kit/app-icon-1024.png">App icon PNG</Dl>}>
            <div className={styles.markStage}>
              {[120, 80, 56, 32].map((n) => (
                <Image key={n} src="/brand/kit/app-icon-1024.png" alt={`App icon at ${n} pixels`} width={n} height={n} style={{ borderRadius: n * 0.22 }} unoptimized />
              ))}
              <Image src="/brand/kit/mark-on-dark.svg" alt="Po mark with keyline" width={80} height={80} style={{ borderRadius: "50%" }} unoptimized />
            </div>
          </Sub>
          <Sub title="Logo clearance">
            <div className={styles.rules}>
              <div className={styles.clear}>
                <div className={styles.clearBox}>
                  <Image src="/brand/kit/wordmark.svg" alt="Wordmark inside its clear-space boundary" width={480} height={112} unoptimized />
                  <span className={styles.xTag} style={{ top: -26, left: "50%" }}>x</span>
                  <span className={styles.xTag} style={{ left: -24, top: "40%" }}>x</span>
                </div>
              </div>
              <div>
                <p>Keep x clear on every side, where x is twice the diameter of the vermilion dot.</p>
                <div className={styles.minRow}>
                  <div>
                    <Image src="/brand/kit/wordmark.svg" alt="Wordmark at 96 pixels" width={96} height={22} unoptimized />
                    <div className={styles.cap}>Wordmark 96px wide, 20mm in print</div>
                  </div>
                  <div>
                    <Image src="/brand/kit/mark.svg" alt="Po mark at 24 pixels" width={24} height={24} unoptimized />
                    <div className={styles.cap}>Mark 24px, 6mm in print</div>
                  </div>
                </div>
              </div>
            </div>
          </Sub>
          <Sub title="Logo misuse">
            <div className={styles.ddGrid}>
              {MISUSE.map((m) => (
                <div key={m.label} className={styles.dd}>
                  <div className={styles.ddStage} style={{ background: m.bg, overflow: "hidden" }}>
                    <Image src={`/brand/kit/${m.src}.svg`} alt={`Misuse: ${m.label}`} width={m.src === "mark" ? 110 : 260} height={m.src === "mark" ? 110 : 70} style={m.style} unoptimized />
                  </div>
                  <div className={styles.ddBody}>
                    <Badge tone="vermilion">DON&apos;T</Badge>
                    <span>{m.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </Sub>
        </div>
      </section>

      <section id="color" className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.label}>05 · Color</div>
          <h2 className={styles.h2}>Color</h2>
          <Sub title="Primary palette">
            <p>Parchment pages, tyrian bands, ink text and one vermilion button per screen.</p>
            <div className={styles.swGrid}>
              {PRIMARY.map((c) => <CopySwatch key={c.hex} {...c} />)}
            </div>
          </Sub>
          <Sub title="Secondary palette">
            <p>Game colors, feedback and system tints.</p>
            <div className={styles.swGrid}>
              {SUPPORT.map((c) => <CopySwatch key={c.hex} {...c} />)}
            </div>
          </Sub>
          <Sub title="Neutral palette">
            <div className={styles.swGrid}>
              {GRAYS.map((c) => <CopySwatch key={c.hex} {...c} />)}
            </div>
          </Sub>
        </div>
      </section>

      <PlayColor />
      <Flags />

      <section id="type" className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.label}>06 · Typography</div>
          <h2 className={styles.h2}>Round type for every script</h2>
          <Sub title="Primary typeface" action={<ButtonLink href="https://fonts.google.com/specimen/Fredoka" variant="secondary" size="sm" target="_blank" rel="noreferrer">Fredoka on Google Fonts</ButtonLink>}>
            <div className={styles.specimen} style={{ fontFamily: "Fredoka, sans-serif", fontWeight: 700 }}>Aa Bb Cc 123</div>
            <p>Fredoka sets titles, buttons and game names at 600 to 700.</p>
          </Sub>
          <Sub title="Secondary typeface" action={<ButtonLink href="https://fonts.google.com/specimen/Nunito" variant="secondary" size="sm" target="_blank" rel="noreferrer">Nunito on Google Fonts</ButtonLink>}>
            <div className={styles.specimen} style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800 }}>Aa Bb Cc 123</div>
            <p>Nunito sets body text at 400 to 900. Space Mono sets labels in caps. Noto Sans covers every native script.</p>
          </Sub>
          <div className={styles.scripts} aria-label="Hundred in seven scripts">
            {["cien", "ἑκατόν", "сто", "מאה", "مئة", "शतम्", "百"].map((w) => <span key={w}>{w}</span>)}
          </div>
          {TYPE.map((t) => (
            <div key={t.face} className={styles.spec}>
              <div className={styles.specMeta}>
                <strong>{t.face}</strong>
                <br />
                {t.meta}
              </div>
              <div style={t.style}>{t.sample}</div>
            </div>
          ))}
          <Sub title="What to avoid">
            <div className={styles.ddGrid}>
              {AVOID.map((a) => (
                <div key={a.label} className={styles.dd}>
                  <div className={styles.ddStage} style={{ background: "#F6EEDC" }}>
                    <span style={{ ...a.style, fontSize: 30, color: "#5B1A4A" }}>one word</span>
                  </div>
                  <div className={styles.ddBody}>
                    <Badge tone={a.ok ? "malachite" : "vermilion"}>{a.ok ? "DO" : "DON'T"}</Badge>
                    <span>{a.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </Sub>
        </div>
      </section>

      <Icons />
      <Illustration />

      <section id="imagery" className={`${styles.section} ${styles.band}`}>
        <div className={styles.wrap}>
          <div className={styles.label}>07 · Imagery</div>
          <h2 className={styles.h2}>Word tiles and the app</h2>
          <Sub title="Word tiles">
            <p>Each tile carries a flag, a parchment card, the word in its own script, a mono language label and the IPA. Odd tiles tilt left, even tiles tilt right and lift.</p>
            <div className={styles.tiles} style={{ marginTop: 24 }}>
              {NIGHT.map((t) => <TileView key={t.lang} t={t} />)}
            </div>
            <p className={styles.cap}>Word data: Wiktionary via Kaikki, CC BY-SA 4.0.</p>
          </Sub>
          <Sub title="App screens">
            <div className={styles.screens}>
              {SCREENS.map((x) => (
                <Image key={x.file} src={`/brand/screens/${x.file}.jpg`} alt={x.alt} width={660} height={1434} unoptimized />
              ))}
            </div>
            <Image className={styles.og} src="/brand/og.jpg" alt="Polingual share image with word tiles in six scripts" width={1200} height={630} unoptimized />
            <p className={styles.cap}>Share image, 1200 by 630.</p>
          </Sub>
          <Sub title="Tiles do and don't">
            <div className={styles.ddGrid}>
              <div className={styles.dd}>
                <div className={styles.ddStage} style={{ background: "#3A0F2F" }}>
                  <div className={styles.miniTiles}>{NIGHT.slice(0, 3).map((t) => <TileView key={t.lang} t={t} />)}</div>
                </div>
                <div className={styles.ddBody}><Badge tone="malachite">DO</Badge><span>Tiles tilted, on tyrian or parchment</span></div>
              </div>
              <div className={styles.dd}>
                <div className={styles.ddStage} style={{ background: "#fff" }}>
                  <div className={`${styles.miniTiles} ${styles.flat}`}>{NIGHT.slice(0, 3).map((t) => <TileView key={t.lang} t={t} />)}</div>
                </div>
                <div className={styles.ddBody}><Badge tone="vermilion">DON&apos;T</Badge><span>Flat tiles in a rigid grid on white</span></div>
              </div>
            </div>
            <PlayDos />
          </Sub>
        </div>
      </section>

      <AvatarSection />
      <Motion />
      <Components />

      <section id="downloads" className={`${styles.section} ${styles.band}`}>
        <div className={styles.wrap}>
          <div className={styles.label}>Downloads</div>
          <h2 className={styles.h2}>Every file</h2>
          <p className={styles.lede}>Press questions go to Gianangelo Dichio at gianyrox@gmail.com.</p>
          <div className={s.cards}>
            {DOWNLOADS.map((d) => (
              <Card key={d.href} tone="ink">
                <h3 className={s.cardTitle} style={{ color: "#F6EEDC" }}>{d.name}</h3>
                <p className={s.cardText} style={{ color: "rgba(246,238,220,.75)" }}>{d.meta}</p>
                <ButtonLink href={d.href} download onDark variant="secondary" size="sm">Download</ButtonLink>
              </Card>
            ))}
          </div>
          <div className={styles.ctaRow}>
            <ButtonLink href="/brand/polingual-press-kit.zip" download size="xl">Download full brand kit</ButtonLink>
            <ButtonLink href="#top" variant="ghost" onDark size="xl">Back to top</ButtonLink>
          </div>
        </div>
      </section>
    </main>
  );
}

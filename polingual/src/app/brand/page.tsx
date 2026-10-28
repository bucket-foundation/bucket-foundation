import type { Metadata } from "next";
import Image from "next/image";
import CopySwatch from "./CopySwatch";
import styles from "./brand.module.css";

export const metadata: Metadata = {
  title: { absolute: "Polingual Brand" },
  description: "The Polingual brand: the Po mark, colors, type, word tiles, voice, app screens and a press kit download.",
  alternates: { canonical: "/brand" },
};

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

const SUPPORT = [
  { name: "Parchment 2", hex: "#EBDDBE", ink: "#231F20", role: "Cards" },
  { name: "Tyrian deep", hex: "#3A0F2F", ink: "#F6EEDC", role: "Dark cards" },
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
    <main className={styles.page}>
      <link rel="stylesheet" href={FONTS} precedence="default" />
      <div className={styles.wrap}>
        <header className={styles.top}>
          <Image src="/brand/kit/wordmark.svg" alt="Polingual" width={240} height={80} unoptimized priority />
          <a className={styles.topLink} href="/">polingual.com</a>
        </header>
      </div>

      <section className={styles.hero}>
        <div className={`${styles.wrap} ${styles.heroGrid}`}>
          <div>
            <div className={styles.label}>Brand · Polingual</div>
            <h1 className={styles.heroTitle}>
              Language learning for <span>multilingual</span> learners.
            </h1>
            <p className={styles.lede}>One word, every language, one meaning. The mark, colors, type, tiles and voice behind Polingual.</p>
            <div className={styles.ctaRow}>
              <a className={styles.cta} href="/brand/polingual-press-kit.zip" download>
                Download press kit
              </a>
              <a className={`${styles.cta} ${styles.ctaGhost}`} href="#logo">
                Logo files
              </a>
            </div>
            <nav className={styles.nav} aria-label="Brand sections">
              <a href="#story">Story</a>
              <a href="#logo">Logo</a>
              <a href="#color">Color</a>
              <a href="#type">Type</a>
              <a href="#tiles">Tiles</a>
              <a href="#voice">Voice</a>
              <a href="#screens">Screens</a>
              <a href="#usage">Usage</a>
              <a href="#press">Press kit</a>
            </nav>
          </div>
          <div className={styles.tiles}>
            {NIGHT.slice(0, 8).map((t) => (
              <TileView key={t.lang} t={t} />
            ))}
          </div>
        </div>
        <div className={styles.heroFoot} />
      </section>

      <section id="story" className={`${styles.section} ${styles.band}`} style={{ paddingTop: 24 }}>
        <div className={`${styles.wrap} ${styles.stat}`}>
          <div>
            <div className={styles.label}>Story and mission</div>
            <h2 className={styles.h2}>One deck, many languages</h2>
            <p className={styles.lede}>Polingual teaches a word once and shows it in every sibling language, with its sound and its roots. Learners build a family of languages together. Proceeds fund Bucket Foundation&apos;s free science.</p>
            <p className={styles.statLine} style={{ marginTop: 28 }}>
              After 100 days, expect to know <span>280 words</span> across <span>4 languages</span>, and remember <span>95%</span> of them.
            </p>
            <p className={styles.note}>Simulation: FSRS scheduler, 4 languages, 5 new words a day per language, 14 cards a session, 8 runs. Mean 283.6 words, 95.3% retained. polingual/scripts/sim_100_days.ts</p>
          </div>
          <div className={styles.nums}>
            <div className={styles.num}>
              <div className={styles.numN}>28</div>
              <div className={styles.numL}>languages</div>
            </div>
            <div className={styles.num}>
              <div className={styles.numN}>1,000</div>
              <div className={styles.numL}>top words per language</div>
            </div>
            <div className={styles.num}>
              <div className={styles.numN}>300</div>
              <div className={styles.numL}>phrases per language</div>
            </div>
            <div className={styles.num}>
              <div className={styles.numN}>100</div>
              <div className={styles.numL}>day streak goal</div>
            </div>
          </div>
        </div>
      </section>

      <section id="logo" className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.label}>Logo</div>
          <h2 className={styles.h2}>The Po square</h2>
          <p className={styles.lede}>A tyrian rounded square with a parchment Po and a vermilion dot. The wordmark sets polingual in lowercase Nunito Black beside it.</p>
          <div className={styles.logoGrid}>
            {LOGOS.map((l) => (
              <div key={l.file} className={styles.logoCard} style={{ background: l.bg, color: l.ink }}>
                <Image src={`/brand/kit/${l.file}.${l.png ? "png" : "svg"}`} alt={l.alt} width={360} height={120} unoptimized />
                <div className={styles.logoName}>{l.name}</div>
                <div className={styles.dl}>
                  {l.png ? null : (
                    <a href={`/brand/kit/${l.file}.svg`} download>
                      SVG
                    </a>
                  )}
                  <a href={`/brand/kit/${l.file}.png`} download>
                    PNG 1024
                  </a>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.rules}>
            <div className={styles.clear}>
              <div className={styles.clearBox}>
                <Image src="/brand/kit/wordmark.svg" alt="Wordmark inside its clear-space boundary" width={480} height={112} unoptimized />
                <span className={styles.xTag} style={{ top: -26, left: "50%" }}>x</span>
                <span className={styles.xTag} style={{ left: -24, top: "40%" }}>x</span>
              </div>
            </div>
            <div>
              <h3 className={styles.h3}>Clear space</h3>
              <p>Keep x clear on every side, where x is twice the diameter of the vermilion dot. Tiles, text and edges stay outside it.</p>
              <h3 className={styles.h3} style={{ marginTop: 24 }}>Minimum size</h3>
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
        </div>
      </section>

      <section id="color" className={styles.section} style={{ paddingTop: 0 }}>
        <div className={styles.wrap}>
          <div className={styles.label}>Color</div>
          <h2 className={styles.h2}>Color tokens</h2>
          <p className={styles.lede}>Tap a swatch to copy its hex. Parchment pages, tyrian bands, ink text and one vermilion button per screen.</p>
          <div className={styles.swGrid}>
            {PRIMARY.map((c, i) => (
              <div key={c.hex} className={i < 2 ? styles.swBig : undefined} style={{ display: "grid" }}>
                <CopySwatch {...c} />
              </div>
            ))}
            {SUPPORT.map((c) => (
              <CopySwatch key={c.hex} {...c} />
            ))}
          </div>
        </div>
      </section>

      <section id="type" className={styles.section} style={{ paddingTop: 0 }}>
        <div className={styles.wrap}>
          <div className={styles.label}>Type</div>
          <h2 className={styles.h2}>Round type for every script</h2>
          <div className={styles.scripts} aria-label="Hundred in six scripts">
            <span>cien</span>
            <span>ἑκατόν</span>
            <span>сто</span>
            <span>מאה</span>
            <span>مئة</span>
            <span>शतम्</span>
            <span>百</span>
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
        </div>
      </section>

      <section id="tiles" className={`${styles.section} ${styles.band}`}>
        <div className={styles.wrap}>
          <div className={styles.label}>Word tiles</div>
          <h2 className={styles.h2}>Night in twelve languages</h2>
          <p className={styles.lede}>Each tile carries a flag, a parchment card, the word in its own script, a mono language label and the IPA. Odd tiles tilt left, even tiles tilt right and lift.</p>
          <div className={styles.tiles} style={{ marginTop: 24 }}>
            {NIGHT.map((t) => (
              <TileView key={t.lang} t={t} />
            ))}
          </div>
          <p className={styles.cap}>Word data: Wiktionary via Kaikki, CC BY-SA 4.0.</p>
        </div>
      </section>

      <section id="voice" className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.label}>Voice</div>
          <h2 className={styles.h2}>Say it once, plainly</h2>
          <p className={styles.lede}>Lead with what the learner gets. Numbers carry the claim. No dashes, no hype, no comparisons with rivals.</p>
          <div className={styles.voiceGrid}>
            {VOICE.map((v) => (
              <div key={v.ok} className={styles.pair} style={{ color: "#F6EEDC" }}>
                <span className={styles.ok}>WRITE</span>
                <div className={styles.pairText}>{v.ok}</div>
                <span className={styles.no}>NEVER</span>
                <div className={`${styles.pairText} ${styles.strike}`}>{v.no}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="screens" className={styles.section} style={{ paddingTop: 0 }}>
        <div className={styles.wrap}>
          <div className={styles.label}>Imagery</div>
          <h2 className={styles.h2}>The app</h2>
          <div className={styles.screens}>
            {SCREENS.map((s) => (
              <Image key={s.file} src={`/brand/screens/${s.file}.jpg`} alt={s.alt} width={660} height={1434} unoptimized />
            ))}
          </div>
          <p className={styles.cap}>Polingual for iPhone, App Store screenshots.</p>
          <Image className={styles.og} src="/brand/og.jpg" alt="Polingual share image with word tiles in six scripts" width={1200} height={630} unoptimized />
          <p className={styles.cap}>Share image, 1200 by 630.</p>
        </div>
      </section>

      <section id="usage" className={styles.section} style={{ paddingTop: 0 }}>
        <div className={styles.wrap}>
          <div className={styles.label}>Usage</div>
          <h2 className={styles.h2}>Do and don&apos;t</h2>
          <div className={styles.ddGrid}>
            <div className={styles.dd}>
              <div className={styles.ddStage} style={{ background: "#F6EEDC" }}>
                <Image src="/brand/kit/wordmark.svg" alt="Wordmark on parchment" width={320} height={75} unoptimized />
              </div>
              <div className={styles.ddBody}>
                <span className={styles.ok}>DO</span>
                <span>Wordmark on parchment</span>
              </div>
            </div>
            <div className={styles.dd}>
              <div className={styles.ddStage} style={{ background: "#D9381E" }}>
                <Image src="/brand/kit/mark.svg" alt="Po mark on vermilion" width={110} height={110} unoptimized />
              </div>
              <div className={styles.ddBody}>
                <span className={styles.no}>DON&apos;T</span>
                <span>Po mark on vermilion</span>
              </div>
            </div>
            <div className={styles.dd}>
              <div className={styles.ddStage} style={{ background: "#5B1A4A" }}>
                <div className={styles.miniTiles}>
                  {NIGHT.slice(0, 3).map((t) => (
                    <TileView key={t.lang} t={t} />
                  ))}
                </div>
              </div>
              <div className={styles.ddBody}>
                <span className={styles.ok}>DO</span>
                <span>Tiles tilted, on tyrian or parchment</span>
              </div>
            </div>
            <div className={styles.dd}>
              <div className={styles.ddStage} style={{ background: "#fff" }}>
                <div className={`${styles.miniTiles} ${styles.flat}`}>
                  {NIGHT.slice(0, 3).map((t) => (
                    <TileView key={t.lang} t={t} />
                  ))}
                </div>
              </div>
              <div className={styles.ddBody}>
                <span className={styles.no}>DON&apos;T</span>
                <span>Flat tiles in a rigid grid on white</span>
              </div>
            </div>
            <div className={styles.dd}>
              <div className={styles.ddStage} style={{ background: "#EBDDBE" }}>
                <Image src="/brand/kit/wordtype.svg" alt="Wordtype at true proportions" width={300} height={80} unoptimized />
              </div>
              <div className={styles.ddBody}>
                <span className={styles.ok}>DO</span>
                <span>Lowercase wordtype at true proportions</span>
              </div>
            </div>
            <div className={styles.dd}>
              <div className={styles.ddStage} style={{ background: "#EBDDBE" }}>
                <Image src="/brand/kit/wordtype.svg" alt="Wordtype stretched" width={300} height={80} style={{ transform: "scaleY(1.7) skewX(-12deg)" }} unoptimized />
              </div>
              <div className={styles.ddBody}>
                <span className={styles.no}>DON&apos;T</span>
                <span>Stretched or slanted wordtype</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="press" className={`${styles.section} ${styles.band}`}>
        <div className={`${styles.wrap} ${styles.kit}`}>
          <div>
            <div className={styles.label}>Press kit</div>
            <h2 className={styles.h2}>Everything in one download</h2>
            <p className={styles.lede}>Logos, app icon, screens, share image and a fact sheet. Press questions go to Gianangelo Dichio, @gianyrox, at gianyrox@gmail.com.</p>
            <div className={styles.ctaRow}>
              <a className={styles.cta} href="/brand/polingual-press-kit.zip" download>
                Download press kit · 0.7 MB
              </a>
            </div>
          </div>
          <ul className={styles.kitList}>
            <li>logos/ · 5 SVG, 6 PNG with the app icon</li>
            <li>screens/ · 6 iPhone screens</li>
            <li>og.jpg · share image</li>
            <li>FACTS.txt · story, numbers, colors and logo rules</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

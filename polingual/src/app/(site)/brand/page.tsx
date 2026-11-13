import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Badge, ButtonLink, tokens, type ColorToken, type TypeToken } from "@/ui";
import { Art } from "@/ui/art";
import { HERO_PIECES, OBJECT_PIECES } from "@/ui/art/brand";
import ArtLibrary from "./ArtLibrary";
import CopySwatch from "./CopySwatch";
import MotionDemo from "./MotionDemo";
import SectionNav from "./SectionNav";
import styles from "./brand.module.css";
import { pageMeta } from "@/lib/meta";

export const metadata: Metadata = pageMeta({ path: "/brand", title: "Polingual Brand", description: "The Polingual brand: the Po mark, colors, type, artwork library, patterns, motion, voice, product screens and a press kit download." });

const FONTS = "https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;500;600;700;800;900&family=Space+Mono:wght@400;700&family=Noto+Sans:wght@400;700;800&family=Noto+Sans+Hebrew:wght@700&family=Noto+Sans+Devanagari:wght@700;800&family=Noto+Sans+SC:wght@700&display=swap";

const KIT = "/brand/polingual-press-kit.zip";

const SECTIONS = [
  ["story", "Story"], ["logo", "Logo"], ["color", "Color"], ["type", "Type"], ["artwork", "Artwork"], ["patterns", "Patterns"],
  ["illustration", "Illustration"], ["motion", "Motion"], ["voice", "Voice"], ["screens", "Product"], ["downloads", "Downloads"],
] as const;

const ROLES: Partial<Record<ColorToken, string>> = {
  paper: "Page ground", "paper-2": "Cards on paper", "paper-3": "Pressed cards", card: "Raised surfaces", white: "Tile gloss",
  ink: "Text and outlines", "ink-2": "Text on tinted grounds", "ink-dim": "Secondary text", "ink-faint": "Captions",
  tyrian: "Mark and bands", "tyrian-deep": "TV stage", vermilion: "The one button", "vermilion-deep": "Button lip",
  lapis: "Selection", "lapis-deep": "Selection lip", "lapis-soft": "Selected fill", ochre: "Streaks and coins", "ochre-deep": "Coin lip",
  malachite: "Correct", "malachite-deep": "Correct lip", maya: "Audio", hairline: "Dividers", "hairline-2": "Strong dividers",
};

const GROUPS: { title: string; names: ColorToken[] }[] = [
  { title: "Grounds", names: ["paper", "paper-2", "paper-3", "card", "white"] },
  { title: "Ink", names: ["ink", "ink-2", "ink-dim", "ink-faint", "hairline", "hairline-2"] },
  { title: "Brand", names: ["tyrian", "tyrian-deep", "vermilion", "vermilion-deep"] },
  { title: "Game colors", names: ["lapis", "lapis-deep", "lapis-soft", "ochre", "ochre-deep", "malachite", "malachite-deep", "maya"] },
];

const TYPE_USE: Record<TypeToken, string> = {
  hero: "Language learning for multilingual learners.",
  title: "Four languages, one word",
  heading: "Today's deck",
  body: "Hear every word said and see its roots.",
  small: "5 new words a day per language.",
  label: "SPANISH · 100 DAY STREAK",
  word: "ἑκατόν",
};

const FACES = [
  { key: "display", name: "Fredoka", use: "Titles, buttons, game names and words on tiles.", href: "https://fonts.google.com/specimen/Fredoka" },
  { key: "body", name: "Nunito", use: "Body text, lists and long reading.", href: "https://fonts.google.com/specimen/Nunito" },
  { key: "mono", name: "Space Mono", use: "Language labels, captions and codes, set in caps.", href: "https://fonts.google.com/specimen/Space+Mono" },
] as const;

const MISUSE = [
  { label: "Stretched", cls: "mStretch" },
  { label: "Rotated", cls: "mRotate" },
  { label: "Recolored", cls: "mHue" },
  { label: "Drop shadows and blur", cls: "mFx" },
  { label: "On vermilion", cls: "mRed" },
  { label: "Low contrast ground", cls: "mDim" },
] as const;

const VOICE = [
  { ok: "After 100 days, expect to know 280 words across 4 languages.", no: "Master any language in record time!" },
  { ok: "Hear every word said and see its roots.", no: "An immersive, seamless language journey." },
  { ok: "Games are free. Play with friends on one TV.", no: "Unlock premium fun today!" },
  { ok: "3 days free, then $59.99 a year.", no: "Risk-free, cancel anytime, best deal ever!" },
];

const SCREENS = [
  { file: "home", label: "Homepage" },
  { file: "app", label: "App" },
  { file: "play", label: "Play" },
  { file: "ispy", label: "I Spy" },
  { file: "word", label: "Word page" },
  { file: "join", label: "Join a room" },
];

const RULES = [
  { ok: true, t: "Use the hero artwork as it is drawn: thick ink outlines, flat fills, one hard shadow." },
  { ok: true, t: "Tilt tiles and stickers a few degrees and let them overlap on tyrian or paper." },
  { ok: true, t: "Pair every script with its own Noto face so the word reads right." },
  { ok: true, t: "Scatter confetti dots in white and vermilion at the edges of a scene." },
  { ok: false, t: "Generic icon packs, emoji or stock photos in place of the artwork." },
  { ok: false, t: "Gradients, glows or soft blurred shadows on the art." },
  { ok: false, t: "Redrawn flags or invented scripts." },
  { ok: false, t: "Art packed in a rigid grid on white with no tilt." },
];

function Section({ id, n, title, lede, dark, children }: { id: string; n: number; title: string; lede?: ReactNode; dark?: boolean; children: ReactNode }) {
  return (
    <section id={id} className={styles.section} data-dark={dark || undefined} aria-labelledby={`${id}-h`}>
      <div className={styles.label}>{String(n).padStart(2, "0")} · {SECTIONS[n - 1][1]}</div>
      <h2 id={`${id}-h`} className={styles.h2}>{title}</h2>
      {lede ? <p className={styles.lede}>{lede}</p> : null}
      {children}
    </section>
  );
}

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

function Dl({ href, children }: { href: string; children: ReactNode }) {
  return <ButtonLink href={href} download variant="secondary" size="sm">{children}</ButtonLink>;
}

function StarLattice({ id }: { id: string }) {
  return (
    <svg className={styles.patternSvg} aria-hidden="true">
      <defs>
        <pattern id={id} width="90" height="90" patternUnits="userSpaceOnUse">
          <rect width="90" height="90" style={{ fill: "var(--pl-tyrian)" }} />
          <path d="M0 0L90 90M90 0L0 90M45 0V90M0 45H90" style={{ stroke: "var(--pl-tyrian-deep)", strokeWidth: 2, opacity: 0.6 }} />
          <path d="M45 33l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" style={{ fill: "var(--pl-vermilion)", opacity: 0.55 }} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

export default function BrandPage() {
  return (
    <main className={styles.page} id="top">
      <link rel="stylesheet" href={FONTS} precedence="default" />
      <header className={styles.top}>
        <a href="/" className={styles.topMark}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/kit/wordmark.svg" alt="Polingual" width={180} height={44} />
        </a>
        <span className={styles.topLabel}>Brand guidelines</span>
        <ButtonLink href={KIT} download size="sm">Download kit</ButtonLink>
      </header>

      <div className={styles.shell}>
        <SectionNav sections={SECTIONS} />
        <div className={styles.content}>
          <section className={styles.hero} aria-labelledby="hero-h">
            <div className={styles.heroText}>
              <div className={styles.label}>Polingual brand</div>
              <h1 id="hero-h" className={styles.heroTitle}>One word, <span>every language</span>.</h1>
              <p className={styles.lede}>The mark, colors, type, artwork and voice behind Polingual. Artwork, logos and marks download as SVG and PNG. Screens download as PNG.</p>
              <div className={styles.ctaRow}>
                <ButtonLink href={KIT} download size="lg">Download full brand kit</ButtonLink>
                <ButtonLink href="#artwork" variant="secondary" size="lg">Artwork library</ButtonLink>
              </div>
            </div>
            <div className={styles.heroArt} aria-hidden="true">
              <StarLattice id="hero-lattice" />
              <Art name="azulejo" size={150} shadow className={styles.ha1} />
              <Art name="ticket" size={170} shadow className={styles.ha2} />
              <Art name="seal" size={120} shadow className={styles.ha3} />
              <Art name="torn-label" size={140} shadow className={styles.ha4} />
              <Art name="kente" size={200} shadow className={styles.ha5} />
            </div>
          </section>

          <Section id="story" n={1} title="Learn a family of languages at once" lede={<>Polingual teaches a word once and shows it in every sibling language, <strong>with its sound and its roots</strong>. A study app and a party game, from the team behind Bucket Foundation.</>}>
            <div className={styles.storyGrid}>
              <div className={styles.storyCard}>
                <Art name="streak-flame" size={72} />
                <p className={styles.statLine}>After 100 days, expect to know <span>280 words</span> across <span>4 languages</span>, and remember <span>95%</span> of them.</p>
                <p className={styles.cap}>FSRS simulation, 5 new words a day per language, 8 runs. polingual/scripts/sim_100_days.ts</p>
              </div>
              <ul className={styles.nums}>
                {[["28", "languages"], ["1,000", "top words each"], ["300", "phrases each"], ["12", "party games"]].map(([n, l]) => (
                  <li key={l}><b>{n}</b><span>{l}</span></li>
                ))}
              </ul>
            </div>
            <Sub title="Who it is for">
              <p className={styles.body}>Heritage speakers, travelers, families with two or more home languages and anyone who wants more than one language at a time. Proceeds fund Bucket Foundation, which keeps primary research free to read.</p>
            </Sub>
          </Section>

          <Section id="logo" n={2} title="The Po square" lede="A tyrian rounded square with a paper Po and a vermilion dot, set beside the lowercase wordmark.">
            <div className={styles.logoGrid}>
              {[
                { f: "mark", name: "Po mark", ground: "paper" },
                { f: "mark-on-dark", name: "Po mark, keyline", ground: "tyrian-deep" },
                { f: "wordmark", name: "Wordmark", ground: "paper" },
                { f: "wordmark-on-dark", name: "Wordmark on tyrian", ground: "tyrian" },
                { f: "wordtype", name: "Wordtype", ground: "paper-2" },
              ].map((l) => (
                <figure key={l.f} className={styles.logoCard}>
                  <div className={styles.logoStage} style={{ background: `var(--pl-${l.ground})` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/brand/kit/${l.f}.svg`} alt={l.name} />
                  </div>
                  <figcaption>
                    <strong>{l.name}</strong>
                    <span className={styles.dlRow}>
                      <Dl href={`/brand/kit/${l.f}.svg`}>SVG</Dl>
                      <Dl href={`/brand/kit/${l.f}.png`}>PNG</Dl>
                    </span>
                  </figcaption>
                </figure>
              ))}
              <figure className={styles.logoCard}>
                <div className={styles.logoStage} style={{ background: "var(--pl-ochre)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/kit/app-icon-1024.png" alt="App icon" className={styles.appIcon} />
                </div>
                <figcaption><strong>App icon</strong><span className={styles.dlRow}><Dl href="/brand/kit/app-icon-1024.png">PNG 1024</Dl></span></figcaption>
              </figure>
            </div>
            <Sub title="Clear space">
              <div className={styles.clear}>
                <div className={styles.clearBox}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/kit/wordmark.svg" alt="Wordmark inside its clear space" />
                  <span className={styles.xTop}>x</span>
                  <span className={styles.xSide}>x</span>
                </div>
                <p className={styles.body}>Keep x clear on every side, where x is twice the vermilion dot. Smallest sizes: wordmark 96 px wide, mark 24 px.</p>
              </div>
            </Sub>
            <Sub title="Misuse">
              <ul className={styles.misuse}>
                {MISUSE.map((m) => (
                  <li key={m.label}>
                    <div className={`${styles.misuseStage} ${styles[m.cls]}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/brand/kit/wordmark.svg" alt={`Misuse: ${m.label}`} />
                    </div>
                    <span><Badge tone="vermilion">DON&apos;T</Badge> {m.label}</span>
                  </li>
                ))}
              </ul>
            </Sub>
          </Section>

          <Section id="color" n={3} title="Paper, tyrian and one red button" lede={<>Every color comes from <code>src/ui/tokens.json</code>. Tap a value to copy the hex or the CSS variable.</>}>
            {GROUPS.map((g) => (
              <Sub key={g.title} title={g.title}>
                <div className={styles.swGrid}>
                  {g.names.map((n) => <CopySwatch key={n} name={n} role={ROLES[n]} />)}
                </div>
              </Sub>
            ))}
          </Section>

          <Section id="type" n={4} title="Round type for every script" lede="Three families, seven sizes. Native scripts set in the matching Noto face.">
            <div className={styles.faces}>
              {FACES.map((f) => (
                <div key={f.key} className={styles.face}>
                  <div className={styles.faceAa} style={{ fontFamily: `var(--pl-font-${f.key})` }}>Aa</div>
                  <strong>{f.name}</strong>
                  <span>{f.use}</span>
                  <code>--pl-font-{f.key}</code>
                  <ButtonLink href={f.href} target="_blank" rel="noreferrer" variant="quiet" size="sm">Google Fonts</ButtonLink>
                </div>
              ))}
            </div>
            <div className={styles.scale}>
              {(Object.keys(tokens.type) as TypeToken[]).map((k) => {
                const t = tokens.type[k];
                return (
                  <div key={k} className={styles.scaleRow}>
                    <code>{k} · {t.size}/{t.line} · {t.weight}</code>
                    <div style={{ font: `var(--pl-type-${k})`, textTransform: k === "label" ? "uppercase" : undefined, letterSpacing: k === "label" ? "0.08em" : undefined }}>{TYPE_USE[k]}</div>
                  </div>
                );
              })}
            </div>
            <div className={styles.scripts} aria-label="Hundred in seven scripts">
              {["cien", "ἑκατόν", "сто", "מאה", "शतम्", "百", "백"].map((w) => <span key={w}>{w}</span>)}
            </div>
          </Section>

          <Section id="artwork" n={5} title="The artwork library" dark lede={`${HERO_PIECES.length} hero pieces from the homepage and ${OBJECT_PIECES.length} sticker objects. Each piece downloads as SVG and as PNG at 1x and 4x.`}>
            <div className={styles.ctaRow}>
              <ButtonLink href={KIT} download size="md">Download all as ZIP</ButtonLink>
            </div>
            <ArtLibrary />
          </Section>

          <Section id="patterns" n={6} title="Patterns" lede="Four grounds carry every scene. Pick one per surface.">
            <div className={styles.patterns}>
              <figure><div className={`${styles.pat} ${styles.patDots}`} /><figcaption><strong>Dot paper</strong><span>Page ground behind text.</span></figcaption></figure>
              <figure><div className={styles.pat}><StarLattice id="pat-lattice" /></div><figcaption><strong>Star lattice</strong><span>Tyrian scenes, cut on a diagonal.</span></figcaption></figure>
              <figure><div className={`${styles.pat} ${styles.patArt}`}><Art name="flag-band" size={320} /></div><figcaption><strong>Flag band</strong><span>Bottom edge of hero scenes.</span></figcaption></figure>
              <figure><div className={`${styles.pat} ${styles.patArt}`}><Art name="kente" size={300} /></div><figcaption><strong>Kente</strong><span>Strips and accents, never full bleed.</span></figcaption></figure>
            </div>
          </Section>

          <Section id="illustration" n={7} title="Illustration rules" lede="Every screen is part of one illustrated world built from the homepage hero.">
            <div className={styles.ruleScene} aria-hidden="true">
              <StarLattice id="rule-lattice" />
              <Art name="seal" size={110} shadow className={styles.rs1} />
              <Art name="script-ko" size={90} className={styles.rs2} />
              <Art name="pebble" size={100} shadow className={styles.rs3} />
              <Art name="bunting" size={220} className={styles.rs4} />
            </div>
            <ul className={styles.rules}>
              {RULES.map((r) => (
                <li key={r.t} data-ok={r.ok || undefined}>
                  <Badge tone={r.ok ? "malachite" : "vermilion"}>{r.ok ? "DO" : "DON'T"}</Badge>
                  <span>{r.t}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="motion" n={8} title="Motion" lede="Three durations and one springy ease. Motion confirms a tap and then gets out of the way.">
            <MotionDemo />
          </Section>

          <Section id="voice" n={9} title="Say it once, plainly" lede="Warm, specific and short. Lead with what the learner gets. Numbers carry the claim.">
            <ul className={styles.voice}>
              {VOICE.map((v) => (
                <li key={v.ok}>
                  <div><Badge tone="malachite">WRITE</Badge><p>{v.ok}</p></div>
                  <div><Badge tone="vermilion">NEVER</Badge><p className={styles.strike}>{v.no}</p></div>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="screens" n={10} title="Product screens" lede="Captured from the running app on a 390 by 844 phone.">
            <ul className={styles.screens}>
              {SCREENS.map((x) => (
                <li key={x.file}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/brand/screens/${x.file}.png`} alt={`Polingual ${x.label} screen`} width={390} height={844} />
                  <span>{x.label}</span>
                  <Dl href={`/brand/screens/${x.file}.png`}>PNG</Dl>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="downloads" n={11} title="Every file" dark lede={<>Press questions go through <a href="/support">Polingual support</a>.</>}>
            <ul className={styles.downloads}>
              {[
                { name: "Brand kit", meta: "ZIP · logos, all artwork in SVG and PNG, screens, tokens", href: KIT },
                { name: "Design tokens", meta: "JSON · colors, type, radius, motion", href: "/brand/tokens.json" },
                { name: "Po mark", meta: "SVG", href: "/brand/kit/mark.svg" },
                { name: "Wordmark", meta: "SVG", href: "/brand/kit/wordmark.svg" },
                { name: "App icon", meta: "PNG 1024", href: "/brand/kit/app-icon-1024.png" },
                { name: "Share image", meta: "JPG 1200 by 630", href: "/brand/og.jpg" },
              ].map((d) => (
                <li key={d.href}>
                  <strong>{d.name}</strong>
                  <span>{d.meta}</span>
                  <ButtonLink href={d.href} download onDark variant="secondary" size="sm">Download</ButtonLink>
                </li>
              ))}
            </ul>
            <div className={styles.ctaRow}>
              <ButtonLink href={KIT} download size="xl">Download full brand kit</ButtonLink>
              <ButtonLink href="#top" variant="ghost" onDark size="xl">Back to top</ButtonLink>
            </div>
          </Section>
        </div>
      </div>
    </main>
  );
}

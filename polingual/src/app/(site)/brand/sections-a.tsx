import { Badge, ButtonLink, tokens, type ColorToken, type TypeToken } from "@/ui";
import { Art } from "@/ui/art";
import CopySwatch from "./CopySwatch";
import { Dl, Section, Sub } from "./parts";
import styles from "./brand.module.css";

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

export function StorySection() {
  return (
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
  );
}

export function LogoSection() {
  return (
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
  );
}

export function ColorSection() {
  return (
    <Section id="color" n={3} title="Paper, tyrian and one red button" lede={<>Every color comes from <code>src/ui/tokens.json</code>. Tap a value to copy the hex or the CSS variable.</>}>
      {GROUPS.map((g) => (
        <Sub key={g.title} title={g.title}>
          <div className={styles.swGrid}>
            {g.names.map((n) => <CopySwatch key={n} name={n} role={ROLES[n]} />)}
          </div>
        </Sub>
      ))}
    </Section>
  );
}

export function TypeSection() {
  return (
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
  );
}

import { FLAGS } from "@/lib/flags";
import { Avatar, Coins, Flag, Shape, TierBadge } from "../play-kit/parts";
import { ANSWER_COLORS, TIERS, type Look } from "../play-kit/tokens";
import MotionDemo from "./MotionDemo";
import styles from "./brand.module.css";
import s from "./kit.module.css";

export const SECTIONS = [
  ["story", "Story"], ["logo", "Logo"], ["color", "Color"], ["play-color", "Play color"], ["type", "Type"], ["flags", "Flags"], ["tiles", "Tiles"],
  ["icons", "Icons"], ["avatar", "Avatar"], ["illustration", "Illustration"], ["motion", "Motion"], ["components", "Components"],
  ["voice", "Voice"], ["screens", "Screens"], ["usage", "Usage"], ["press", "Press kit"],
] as const;

export function SideNav() {
  return (
    <nav className={s.side} aria-label="Brand sections">
      <div className={s.sideIn}>
        {SECTIONS.map(([id, name]) => <a key={id} href={`#${id}`}>{name}</a>)}
      </div>
    </nav>
  );
}

const ANSWER_USE: Record<string, string> = {
  triangle: "Answer A. Also the primary button.",
  diamond: "Answer B. Selection and focus rings.",
  circle: "Answer C. Coins, streaks and counters.",
  square: "Answer D. Correct answers and online dots.",
};

const LOOKS: Look[] = [
  { body: "#D9381E", face: "grin", hat: "beret", outfit: "scarf", plinth: "#26428B" },
  { body: "#E9A23B", face: "smile", hat: "sombrero", outfit: "stripe", plinth: "#5B1A4A" },
  { body: "#6FB7C2", face: "cool", hat: "cap", outfit: "plain", plinth: "#1E7A5A" },
  { body: "#26428B", face: "wow", hat: "crown", outfit: "cape", plinth: "#E9A23B" },
  { body: "#1E7A5A", face: "smile", hat: "none", outfit: "scarf", plinth: "#D9381E" },
];

const NAMES: Record<string, string> = {
  en: "English", es: "Spanish", fr: "French", it: "Italian", pt: "Portuguese", de: "German", nl: "Dutch", sv: "Swedish", ru: "Russian", ja: "Japanese",
  ar: "Arabic", el: "Greek", fi: "Finnish", hi: "Hindi", ko: "Korean", pl: "Polish", zh: "Chinese", ang: "Old English", cs: "Czech", fa: "Persian",
  grc: "Ancient Greek", he: "Hebrew", id: "Indonesian", la: "Latin", sa: "Sanskrit", ta: "Tamil", th: "Thai", tr: "Turkish", vi: "Vietnamese", ur: "Urdu",
};

export function PlayColor() {
  return (
    <section id="play-color" className={styles.section} style={{ paddingTop: 0 }}>
      <div className={styles.wrap}>
        <div className={styles.label}>Play color</div>
        <h2 className={styles.h2}>Four answers, eight leagues</h2>
        <p className={styles.lede}>Every answer slot pairs a brand color with a shape, so color-blind players read the shape. The TV and the phone use the same pair.</p>
        <div className={s.grid}>
          {ANSWER_COLORS.map((a) => (
            <div key={a.hex} className={s.chip} style={{ background: a.hex, color: "#F6EEDC" }}>
              <Shape shape={a.shape} size={32} />
              <b>{a.name}</b>
              <code>{a.hex}</code>
              <span>{ANSWER_USE[a.shape]}</span>
            </div>
          ))}
        </div>
        <div className={s.grid}>
          {TIERS.map((t, i) => (
            <div key={t.name} className={s.chip} style={{ background: i === 7 ? "#5B1A4A" : t.color, color: i === 7 ? "#E9A23B" : t.ink }}>
              <code>LEAGUE {i + 1}</code>
              <b>{t.name}</b>
              <code>{i === 7 ? "#E9A23B on #5B1A4A" : t.color}</code>
            </div>
          ))}
        </div>
        <p className={styles.cap}>The stage behind TV rounds is tyrian deep #3A0F2F with parchment text.</p>
      </div>
    </section>
  );
}

export function Flags() {
  return (
    <section id="flags" className={styles.section} style={{ paddingTop: 0 }}>
      <div className={styles.wrap}>
        <div className={styles.label}>Flags and language colors</div>
        <h2 className={styles.h2}>A flag for every language</h2>
        <p className={styles.lede}>Flags are drawn in CSS from src/lib/flags.ts, so they stay crisp at any size and load no images. Dead and classical languages get a two-color brand diagonal.</p>
        <div className={s.flags}>
          {Object.entries(FLAGS).map(([code, bg]) => (
            <div key={code} className={s.flagCell}>
              <i style={{ background: bg }} />
              <span>{code.toUpperCase()}</span>
              <span style={{ fontFamily: "Nunito", fontWeight: 700 }}>{NAMES[code] ?? code}</span>
            </div>
          ))}
        </div>
        <p className={styles.cap}>A flag marks a language. A player&apos;s chosen country flag marks where they play from. Both use the same 7 by 5 ratio and a 1 px keyline.</p>
      </div>
    </section>
  );
}

export function Icons() {
  return (
    <section id="icons" className={styles.section}>
      <div className={styles.wrap}>
        <div className={styles.label}>Iconography</div>
        <h2 className={styles.h2}>Solid shapes, round corners</h2>
        <div className={s.avatars}>
          {ANSWER_COLORS.map((a) => (
            <div key={a.hex} className={s.shape} style={{ background: a.hex }}><Shape shape={a.shape} size={40} /></div>
          ))}
        </div>
        <div className={s.cards}>
          <div className={s.card}><h3>Filled</h3><p>Icons are solid parchment on a color, or tyrian on parchment. No outlines thinner than 2 px.</p></div>
          <div className={s.card}><h3>24 px grid</h3><p>Draw on a 24 px square with 2 px padding. Corners round at 2 px on squares.</p></div>
          <div className={s.card}><h3>Emoji in chat</h3><p>Emoji sit in chat and reactions only. Navigation and buttons use drawn shapes.</p></div>
          <div className={s.card}><h3>Pair with text</h3><p>An icon button carries an aria-label. On a TV controller the shape on the phone matches the shape beside the words on the TV.</p></div>
        </div>
      </div>
    </section>
  );
}

export function AvatarSection() {
  return (
    <section id="avatar" className={`${styles.section} ${styles.band}`}>
      <div className={styles.wrap}>
        <div className={styles.label}>Avatar</div>
        <h2 className={styles.h2}>Meet Polly</h2>
        <p className={styles.lede}>A round parchment head on a soft body, standing on a colored plinth. Every part is a flat SVG layer from a fixed set, so any combination renders on TV, phone, watch and share cards.</p>
        <div className={s.avatars}>
          {LOOKS.map((l, i) => <Avatar key={i} look={l} size={i === 0 ? 150 : 110} />)}
        </div>
        <div className={s.cards}>
          <div className={s.card}><h3>Layers</h3><p>Plinth, body, outfit, head, face, hat. A part never crosses another layer&apos;s slot.</p></div>
          <div className={s.card}><h3>Brand colors only</h3><p>Body and plinth take the six brand colors. Items add ochre, tyrian and ink details.</p></div>
          <div className={s.card}><h3>3 px ink outline</h3><p>The head carries a 3 px ink stroke at 120 px. Scale the stroke with the avatar.</p></div>
          <div className={s.card}><h3>Friendly faces</h3><p>Four faces at launch: smile, grin, wow, shades. No angry or mocking faces.</p></div>
        </div>
      </div>
    </section>
  );
}

export function Illustration() {
  return (
    <section id="illustration" className={styles.section}>
      <div className={styles.wrap}>
        <div className={styles.label}>Illustration</div>
        <h2 className={styles.h2}>Big shapes, dotted parchment</h2>
        <div className={s.cards}>
          <div className={s.card}>
            <div className={s.illus}>
              <span style={{ position: "absolute", right: -40, top: -40, width: 160, height: 160, borderRadius: "50%", background: "#D9381E", opacity: 0.4 }} />
              <span style={{ position: "absolute", left: 20, bottom: 20 }}><Avatar look={LOOKS[0]} size={90} /></span>
              <span style={{ position: "absolute", left: 130, bottom: 28 }}><Flag lang="es" size={34} /></span>
            </div>
            <h3>Hero bands</h3>
            <p>Tyrian field, one large vermilion circle bleeding off a corner, a character and a flag.</p>
          </div>
          <div className={s.card}>
            <div className={s.illus} style={{ background: "#F6EEDC", backgroundImage: "radial-gradient(rgba(35,31,32,.1) 1px,transparent 1.4px)", backgroundSize: "22px 22px" }}>
              <span style={{ position: "absolute", left: 24, top: 30, transform: "rotate(-4deg)" }}><Flag lang="fr" size={44} /></span>
              <span style={{ position: "absolute", left: 110, top: 70, transform: "rotate(3deg)" }}><Flag lang="ja" size={44} /></span>
              <span style={{ position: "absolute", left: 196, top: 36, transform: "rotate(-2deg)" }}><Flag lang="de" size={44} /></span>
            </div>
            <h3>Scattered tiles</h3>
            <p>The landing page dot grid at 22 px. Tiles and flags tilt between minus 4 and plus 4 degrees.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Motion() {
  return (
    <section id="motion" className={styles.section} style={{ paddingTop: 0 }}>
      <div className={styles.wrap}>
        <div className={styles.label}>Motion</div>
        <h2 className={styles.h2}>Quick and bouncy</h2>
        <p className={styles.lede}>Motion confirms an action or a change of state. Every animation sits behind prefers-reduced-motion: no-preference, and the page reads the same without it.</p>
        <MotionDemo />
      </div>
    </section>
  );
}

export function Components() {
  return (
    <section id="components" className={styles.section} style={{ paddingTop: 0 }}>
      <div className={styles.wrap}>
        <div className={styles.label}>Components</div>
        <h2 className={styles.h2}>The parts of every screen</h2>
        <div className={s.cards}>
          <div className={s.card}><div className={s.game} style={{ background: "#D9381E" }}><b>Flags</b><span>Name the language</span></div><h3>Game tile</h3><p>One brand color per game, Fredoka name, 5 px shadow lip.</p></div>
          <div className={s.card}>
            <div className={s.word}><small><Flag lang="es" size={12} /> SPANISH</small><b>perro</b><em>/ˈpero/ · dog</em></div>
            <h3>Learn word card</h3><p>White card, Space Mono language label, the word in Fredoka, reading and meaning below.</p>
          </div>
          <div className={s.card}><button className={s.cta}>Play now</button><h3>Primary CTA</h3><p>Vermilion with a #8E2312 lip. One per screen.</p></div>
          <div className={s.card}><button className={s.ghost}>Invite</button><h3>Ghost button</h3><p>Tyrian 2 px border for the second action.</p></div>
          <div className={s.card}><div style={{ display: "flex", gap: 8 }}><span className={`${s.pill} ${s.pillOn}`}>Flags</span><span className={s.pill}>Tiles</span></div><h3>Chip</h3><p>Choices and filters. Selected fills tyrian.</p></div>
          <div className={s.card}><div style={{ display: "flex", gap: 8, alignItems: "center" }}><Coins n={1340} /><TierBadge tier={4} /></div><h3>Coin chip and tier badge</h3><p>The coin chip opens the shop. The badge shows the weekly league.</p></div>
          <div className={s.card}><span className={s.code}>K7M2QX</span><h3>Room code</h3><p>Space Mono, 0.18 em tracking, six characters with no I, L, O or U.</p></div>
          <div className={s.card}><div className={s.ad}>Ad slot</div><h3>Ad slot</h3><p>Dashed hairline box at the ad unit size. Free tier only, never above the fold on phones, never inside a round.</p></div>
        </div>
      </div>
    </section>
  );
}

export const PLAY_VOICE = [
  { ok: "You're in.", no: "Congratulations! You have successfully joined the room!" },
  { ok: "3 friends playing", no: "Your friends are waiting for you, don't miss out!" },
  { ok: "Get for 400 coins", no: "Only 2 left! Buy now before it's gone!" },
];

export function PlayDos() {
  return (
    <div className={s.dd}>
      <div className={s.do}><b>DO</b>Pair every answer color with its shape.</div>
      <div className={s.dont}><b>DON&apos;T</b>Use red and green alone to mark right and wrong.</div>
      <div className={s.do}><b>DO</b>Show the coin price and the money value side by side in the shop.</div>
      <div className={s.dont}><b>DON&apos;T</b>Add timers, scarcity copy or mystery boxes to purchases.</div>
      <div className={s.do}><b>DO</b>Keep the TV stage on tyrian deep with parchment text.</div>
      <div className={s.dont}><b>DON&apos;T</b>Put an ad on the TV board or between a question and its reveal.</div>
      <div className={s.do}><b>DO</b>Build avatars from the fixed part set.</div>
      <div className={s.dont}><b>DON&apos;T</b>Recolor the Po mark to match a game tile.</div>
    </div>
  );
}

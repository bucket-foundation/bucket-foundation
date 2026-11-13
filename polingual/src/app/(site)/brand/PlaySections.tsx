import { FLAGS } from "@/lib/flags";
import { Avatar, Coins, Flag, Shape, TierBadge } from "../play-kit/parts";
import { ANSWER_COLORS, TIERS, type Look } from "../play-kit/tokens";
import { Badge, Button, Card, Pill } from "@/ui";
import { Art } from "@/ui/art";
import ArtGrid from "./ArtGrid";
import MotionDemo from "./MotionDemo";
import styles from "./brand.module.css";
import s from "./kit.module.css";

export const SECTIONS = [
  ["intro", "Introduction"], ["principles", "Principles"], ["language", "Language"], ["logo", "Logo"], ["color", "Color"], ["type", "Typography"],
  ["icons", "Artwork"], ["illustration", "Illustration"], ["imagery", "Imagery"], ["avatar", "Avatar"], ["motion", "Motion"], ["components", "Components"], ["downloads", "Downloads"],
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
  { backdrop: "maya", plinth: "lapis", shape: "round", skin: "sand", color: "vermilion", outfit: "scarf", face: "grin", hat: "beret", accessory: "pin", frame: "ring" },
  { backdrop: "parchment", plinth: "tyrian", shape: "bell", skin: "clay", color: "ochre", outfit: "stripe", face: "smile", hat: "sombrero", accessory: "none", frame: "sparkle" },
  { backdrop: "ochre", plinth: "malachite", shape: "tall", skin: "porcelain", color: "maya", outfit: "vest", face: "proud", hat: "cap", accessory: "shades", frame: "none" },
  { backdrop: "tyrian", plinth: "ochre", shape: "round", skin: "umber", color: "lapis", outfit: "cape", face: "wow", hat: "crown", accessory: "medal", frame: "laurel" },
  { backdrop: "maya", plinth: "vermilion", shape: "block", skin: "cocoa", color: "malachite", outfit: "scarf", face: "shy", hat: "none", accessory: "headphones", frame: "none" },
];

const SEEDS = ["Brave Otter", "Quiet Heron", "Lucky Fox", "Swift Lynx", "Merry Owl", "Bold Puffin"];

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
        <div className={styles.label}>Artwork</div>
        <h2 className={styles.h2}>Pieces from the hero</h2>
        <p className={styles.lede}>Every piece on the homepage hero, drawn once as SVG: tickets, seals, weaves, tiles and scripts from the languages we teach. Save one piece or the full sheet.</p>
        <div className={s.cards}>
          <Card><Art name="streak-flame" size={40} /><h3 className={s.cardTitle}>Palette fills</h3><p className={s.cardText}>Fill with brand colors only. Ink #231F20 draws every outline at 3 px.</p></Card>
          <Card><Art name="star" size={40} /><h3 className={s.cardTitle}>Hard shadows</h3><p className={s.cardText}>Pieces drop a flat 6 by 8 px shadow at 35% black. No blur.</p></Card>
          <Card><Art name="seal" size={40} /><h3 className={s.cardTitle}>Real scripts</h3><p className={s.cardText}>Words on the pieces come from real languages: 百, शतम्, ἑκατόν, сто.</p></Card>
          <Card><Art name="pebble" size={40} /><h3 className={s.cardTitle}>Tilt and scatter</h3><p className={s.cardText}>Set pieces at -12 to 12 degrees and let them overlap the edge.</p></Card>
        </div>
        <div className={s.avatars}>
          {ANSWER_COLORS.map((a) => (
            <div key={a.hex} className={s.shape} style={{ background: a.hex }}><Shape shape={a.shape} size={40} /></div>
          ))}
        </div>
        <ArtGrid />
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
        <p className={styles.lede}>A round head on a soft body, standing on a colored plinth, with an ink outline and a hard offset shadow. Every part is a flat SVG layer from a fixed set, so any combination renders on TV, phone, watch and share cards.</p>
        <div className={s.avatars}>
          {LOOKS.map((l, i) => <Avatar key={i} look={l} size={i === 0 ? 150 : 110} />)}
        </div>
        <div className={s.avatars} aria-label="Avatars from nicknames">
          {SEEDS.map((n) => <Avatar key={n} seed={n} size="sm" variant="head" label={n} />)}
          {SEEDS.map((n) => <Avatar key={`${n}-chip`} seed={n} size="chip" variant="head" label={n} />)}
        </div>
        <div className={s.cards}>
          <Card><h3 className={s.cardTitle}>Layers</h3><p className={s.cardText}>Backdrop and plinth, body shape, skin, outfit, face, headwear, accessory, tier frame. The order never changes, so any item fits any look.</p></Card>
          <Card><h3 className={s.cardTitle}>Brand colors only</h3><p className={s.cardText}>Body, plinth and backdrop take the seven brand colors. Skin takes eight tones. Items add ochre, tyrian and ink details.</p></Card>
          <Card><h3 className={s.cardTitle}>3 px ink outline</h3><p className={s.cardText}>Every part carries a 3 px ink stroke at 120 px with round joins. The head-only cut keeps scoreboards readable at 24 px.</p></Card>
          <Card><h3 className={s.cardTitle}>Friendly faces</h3><p className={s.cardText}>Eight faces: smile, grin, wow, wink, shy, proud, sleepy, starry. No angry or mocking faces. Players without a saved look get one from their nickname.</p></Card>
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
          <Card>
            <div className={s.illus}>
              <span style={{ position: "absolute", right: -40, top: -40, width: 160, height: 160, borderRadius: "50%", background: "#D9381E", opacity: 0.4 }} />
              <span style={{ position: "absolute", left: 20, bottom: 20 }}><Avatar look={LOOKS[0]} size={90} /></span>
              <span style={{ position: "absolute", left: 130, bottom: 28 }}><Flag lang="es" size={34} /></span>
            </div>
            <h3 className={s.cardTitle}>Hero bands</h3>
            <p className={s.cardText}>Tyrian field, one large vermilion circle bleeding off a corner, a character and a flag.</p>
          </Card>
          <Card>
            <div className={s.illus} style={{ background: "#F6EEDC", backgroundImage: "radial-gradient(rgba(35,31,32,.1) 1px,transparent 1.4px)", backgroundSize: "22px 22px" }}>
              <span style={{ position: "absolute", left: 24, top: 30, transform: "rotate(-4deg)" }}><Flag lang="fr" size={44} /></span>
              <span style={{ position: "absolute", left: 110, top: 70, transform: "rotate(3deg)" }}><Flag lang="ja" size={44} /></span>
              <span style={{ position: "absolute", left: 196, top: 36, transform: "rotate(-2deg)" }}><Flag lang="de" size={44} /></span>
            </div>
            <h3 className={s.cardTitle}>Scattered tiles</h3>
            <p className={s.cardText}>The landing page dot grid at 22 px. Tiles and flags tilt between minus 4 and plus 4 degrees.</p>
          </Card>
          <Card>
            <div className={s.illus} style={{ background: "#EBDDBE", display: "flex", alignItems: "center", justifyContent: "space-around" }}>
              <Art name="star" size={84} />
              <Art name="brush" size={96} />
              <Art name="bunting" size={84} />
            </div>
            <h3 className={s.cardTitle}>Landing pieces</h3>
            <p className={s.cardText}>Star bursts, ochre brush strokes and bunting in flat fills with a 3 px ink line and a hard 6 by 8 drop shadow.</p>
          </Card>
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
          <Card><div className={s.game} style={{ background: "#D9381E" }}><b>Flags</b><span>Name the language</span></div><h3 className={s.cardTitle}>Game tile</h3><p className={s.cardText}>One brand color per game, Fredoka name, 5 px shadow lip.</p></Card>
          <Card>
            <div className={s.word}><small><Flag lang="es" size={12} /> SPANISH</small><b>perro</b><em>/ˈpero/ · dog</em></div>
            <h3 className={s.cardTitle}>Learn word card</h3><p className={s.cardText}>White card, Space Mono language label, the word in Fredoka, reading and meaning below.</p>
          </Card>
          <Card><Button>Play now</Button><h3 className={s.cardTitle}>Primary button</h3><p className={s.cardText}>Vermilion with a #8E2312 lip. One per screen.</p></Card>
          <Card><Button variant="ghost" size="md">Invite</Button><h3 className={s.cardTitle}>Ghost button</h3><p className={s.cardText}>Tyrian 2 px line for the second action.</p></Card>
          <Card><div style={{ display: "flex", gap: 8 }}><Pill active>Flags</Pill><Pill>Tiles</Pill></div><h3 className={s.cardTitle}>Pill</h3><p className={s.cardText}>Choices and filters. Selected fills tyrian.</p></Card>
          <Card><div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><Coins n={1340} /><TierBadge tier={4} /><Badge tone="malachite">New</Badge></div><h3 className={s.cardTitle}>Coins, tiers, badges</h3><p className={s.cardText}>The coin chip opens the shop. The tier badge shows the weekly league.</p></Card>
          <Card><span className={s.code}>K7M2QX</span><h3 className={s.cardTitle}>Room code</h3><p className={s.cardText}>Space Mono, 0.18 em tracking, six characters with no I, L, O or U.</p></Card>
          <Card><div className={s.ad}>Ad slot</div><h3 className={s.cardTitle}>Ad slot</h3><p className={s.cardText}>Dashed hairline box at the ad unit size. Free tier only, never inside a round.</p></Card>
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

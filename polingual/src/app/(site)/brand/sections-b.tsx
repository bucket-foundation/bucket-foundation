import { Badge, ButtonLink } from "@/ui";
import { Art } from "@/ui/art";
import { HERO_PIECES, OBJECT_PIECES } from "@/ui/art/brand";
import ArtLibrary from "./ArtLibrary";
import MotionDemo from "./MotionDemo";
import { Dl, KIT, Section, StarLattice } from "./parts";
import styles from "./brand.module.css";

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

export function ArtworkSection() {
  return (
    <Section id="artwork" n={5} title="The artwork library" dark lede={`${HERO_PIECES.length} hero pieces from the homepage and ${OBJECT_PIECES.length} sticker objects. Each piece downloads as SVG and as PNG at 1x and 4x.`}>
      <div className={styles.ctaRow}>
        <ButtonLink href={KIT} download size="md">Download all as ZIP</ButtonLink>
      </div>
      <ArtLibrary />
    </Section>
  );
}

export function PatternsSection() {
  return (
    <Section id="patterns" n={6} title="Patterns" lede="Four grounds carry every scene. Pick one per surface.">
      <div className={styles.patterns}>
        <figure><div className={`${styles.pat} ${styles.patDots}`} /><figcaption><strong>Dot paper</strong><span>Page ground behind text.</span></figcaption></figure>
        <figure><div className={styles.pat}><StarLattice id="pat-lattice" /></div><figcaption><strong>Star lattice</strong><span>Tyrian scenes, cut on a diagonal.</span></figcaption></figure>
        <figure><div className={`${styles.pat} ${styles.patArt}`}><Art name="flag-band" size={320} /></div><figcaption><strong>Flag band</strong><span>Bottom edge of hero scenes.</span></figcaption></figure>
        <figure><div className={`${styles.pat} ${styles.patArt}`}><Art name="kente" size={300} /></div><figcaption><strong>Kente</strong><span>Strips and accents, never full bleed.</span></figcaption></figure>
      </div>
    </Section>
  );
}

export function IllustrationSection() {
  return (
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
  );
}

export function MotionSection() {
  return (
    <Section id="motion" n={8} title="Motion" lede="Three durations and one springy ease. Motion confirms a tap and then gets out of the way.">
      <MotionDemo />
    </Section>
  );
}

export function VoiceSection() {
  return (
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
  );
}

export function ScreensSection() {
  return (
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
  );
}

export function DownloadsSection() {
  return (
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
  );
}

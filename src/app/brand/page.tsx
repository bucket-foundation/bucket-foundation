import type { Metadata } from "next";
import Image from "next/image";
import CopySwatch from "./CopySwatch";
import styles from "./brand.module.css";

export const metadata: Metadata = {
  title: "Brand · Bucket Foundation",
  description: "The Bucket Foundation brand: lyre and wordmark, colors, type, voice, imagery and a press kit download.",
  alternates: { canonical: "/brand" },
};

const ERAS = [
  { year: "Dec 2022 · bucket 1.0", line: "build the past.", body: "A four-verb network to build, discuss, discover and publish theories of history with evidence." },
  { year: "2022 to 2025", line: "build history.", body: "The verb. The people who built the foundations, gathered in the contributor index." },
  { year: "2026", line: "bucket is the new renaissance.", body: "The thesis. Foundations, new tools and working patronage move at once, as they did in the first Renaissance." },
];

const LOGOS = [
  { name: "Wordmark", file: "wordmark", bg: "var(--bone)", ink: "var(--basalt)", alt: "bucket.foundation wordmark with gold lyre" },
  { name: "Wordmark on basalt", file: "wordmark-bone", bg: "var(--basalt)", ink: "var(--bone)", alt: "bucket.foundation wordmark in bone" },
  { name: "Wordmark, one ink", file: "wordmark-basalt", bg: "var(--bone-2)", ink: "var(--basalt)", alt: "bucket.foundation wordmark in basalt" },
  { name: "Lyre", file: "lyre", bg: "var(--bone)", ink: "var(--basalt)", alt: "Lyre mark in basalt and gold" },
  { name: "Lyre in gold", file: "lyre-gold", bg: "var(--basalt)", ink: "var(--bone)", alt: "Lyre mark in gold" },
  { name: "Lyre in bone", file: "lyre-bone", bg: "var(--aegean-deep)", ink: "var(--bone)", alt: "Lyre mark in bone" },
];

const PRIMARY = [
  { name: "Bone", hex: "#EFE8D4", ink: "#1F1C16", role: "Page" },
  { name: "Basalt", hex: "#1F1C16", ink: "#EFE8D4", role: "Text and dark ground" },
  { name: "Aegean", hex: "#2E6B6B", ink: "#EFE8D4", role: "Action and links" },
  { name: "Gold", hex: "#B8861E", ink: "#1F1C16", role: "Lyre and numerals" },
];

const SUPPORT = [
  { name: "Bone 2", hex: "#E4DCC4", ink: "#1F1C16", role: "Cards" },
  { name: "Basalt 2", hex: "#2A261E", ink: "#EFE8D4", role: "Dark cards" },
  { name: "Aegean deep", hex: "#1F4F4F", ink: "#EFE8D4", role: "Labels" },
  { name: "Gold bright", hex: "#D9A43A", ink: "#1F1C16", role: "Gold on dark" },
  { name: "Laurel", hex: "#5A7A3A", ink: "#EFE8D4", role: "Success" },
  { name: "Crimson", hex: "#9E3A24", ink: "#EFE8D4", role: "Errors" },
  { name: "Papyrus", hex: "#E4D5A8", ink: "#1F1C16", role: "Manuscript" },
  { name: "Verdigris", hex: "#4A8A7A", ink: "#EFE8D4", role: "Charts" },
];

const TYPE = [
  { face: "Cinzel", meta: "Display · 700 · uppercase", sample: "The Canon", style: { fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: "clamp(34px,5vw,64px)" } },
  { face: "Fraunces", meta: "Text · 500 · SOFT 30 · tabular figures", sample: "Spaced study beats massed study for verbal recall.", style: { fontFamily: "Fraunces, serif", fontWeight: 500, fontSize: "clamp(20px,2.4vw,30px)" } },
  { face: "Instrument Serif", meta: "Editorial italic", sample: "build history.", style: { fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontSize: "clamp(30px,4vw,52px)" } },
  { face: "Cinzel small caps", meta: "Labels · 600 · 0.22em tracking", sample: "Seven branches", style: { fontFamily: "Cinzel, serif", fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase" as const, fontSize: "14px", color: "var(--gold-deep)" } },
  { face: "JetBrains Mono", meta: "Code, receipts, citations", sample: "GET /llms.txt  402 Payment Required", style: { fontFamily: "'JetBrains Mono', monospace", fontSize: "clamp(14px,1.6vw,18px)" } },
];

const VOICE = [
  { ok: "The API returns 429 above 100 requests a minute.", no: "Note that the API returns 429 above 100 requests a minute." },
  { ok: "Bone responds to mechanical load.", no: "Bone responds to load, not cardio." },
  { ok: "The site serves the canon at price 0 today.", no: "We are incredibly excited to offer the canon for free." },
  { ok: "Seven branches hold 487 science atoms.", no: "A rich tapestry of knowledge across many realms." },
];

const ART = [
  { file: "alexandria-von-corven.jpg", title: "The Great Library of Alexandria", by: "O. Von Corven, 19th century" },
  { file: "euclid-van-gent.jpg", title: "Euclid", by: "Justus van Gent and Pedro Berruguete, c. 1474" },
  { file: "archimedes-fetti.jpg", title: "Archimedes Thoughtful", by: "Domenico Fetti, 1620" },
  { file: "hypatia-gaspard.jpg", title: "Hypatia", by: "Jules Maurice Gaspard, 1908" },
  { file: "eratosthenes-strozzi.jpg", title: "Eratosthenes Teaching in Alexandria", by: "Bernardo Strozzi, 1635" },
  { file: "herophilus-salgado.jpg", title: "Herophilos", by: "Veloso Salgado, 1906" },
  { file: "zosimos-apparatus.jpg", title: "Distillation apparatus of Zosimos", by: "after Berthelot 1887" },
  { file: "aristarchus-working.jpg", title: "Aristarchus, lunar diagram", by: "10th century manuscript" },
];

const SCREENS = ["Learn, seven branches", "Physics deck", "Study card", "Language progress", "Practice"];

const DOS = [
  { ok: true, label: "Wordmark on bone with clear space", bg: "var(--bone)", src: "/brand/kit/wordmark.svg", css: {} },
  { ok: false, label: "Stretched or squeezed", bg: "var(--bone)", src: "/brand/kit/wordmark.svg", css: { transform: "scaleX(1.5)" } },
  { ok: true, label: "Gold lyre on basalt", bg: "var(--basalt)", src: "/brand/kit/lyre-gold.svg", css: {} },
  { ok: false, label: "Recolored lyre", bg: "var(--bone)", src: "/brand/kit/lyre.svg", css: { filter: "hue-rotate(160deg) saturate(4)" } },
  { ok: true, label: "Bone wordmark on a darkened painting", bg: "linear-gradient(rgba(31,28,22,.62),rgba(31,28,22,.62)), url(/brand/round2/assets/eratosthenes-strozzi.jpg) center/cover", src: "/brand/kit/wordmark-bone.svg", css: {} },
  { ok: false, label: "Basalt wordmark lost on a busy image", bg: "url(/brand/round2/assets/archimedes-fetti.jpg) center/cover", src: "/brand/kit/wordmark-basalt.svg", css: {} },
  { ok: true, label: "Lyre upright, alone", bg: "var(--bone-2)", src: "/brand/kit/lyre.svg", css: {} },
  { ok: false, label: "Rotated or cropped lyre", bg: "var(--bone-2)", src: "/brand/kit/lyre.svg", css: { transform: "rotate(-24deg) translateY(30px)" } },
];

export default function BrandPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={`${styles.wrap} ${styles.heroGrid}`}>
          <div>
            <div className={styles.label} style={{ color: "var(--gold-bright)" }}>Brand · Bucket Foundation</div>
            <h1 className={styles.heroTitle}>
              BUILD THE PAST.
              <br />
              BUILD HISTORY.
              <br />
              <em>bucket is the new renaissance.</em>
            </h1>
            <p className={styles.lede}>Free to read. Paid to cite. Logos, colors, type, voice and imagery for anyone writing about Bucket Foundation.</p>
            <div className={styles.ctaRow}>
              <a className={styles.cta} href="/brand/bucket-press-kit.zip" download>
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
              <a href="#voice">Voice</a>
              <a href="#imagery">Imagery</a>
              <a href="#usage">Usage</a>
              <a href="#press">Press kit</a>
            </nav>
          </div>
          <Image className={styles.heroImg} src="/brand/stone-wordmark.jpg" alt="bucket.foundation wordmark carved in stone with a gold lyre" width={1600} height={1067} priority unoptimized />
        </div>
      </section>

      <section id="story" className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.label}>Story and mission</div>
          <h2 className={styles.h2}>Three slogans</h2>
          <p className={styles.lede}>Bucket Foundation makes primary research paid for once and citeable forever. A citation is designed to route a one-time fee to the author, with a target of 80% or more of net receipts.</p>
          <div className={styles.timeline}>
            {ERAS.map((e) => (
              <div key={e.line} className={styles.era}>
                <div className={styles.eraYear}>{e.year}</div>
                <div className={styles.eraLine}>{e.line}</div>
                <p>{e.body}</p>
              </div>
            ))}
          </div>
          <div className={styles.split}>
            <figure className={styles.figure}>
              <Image src="/brand/round2/assets/alexandria-von-corven.jpg" alt="Engraving of the Great Library of Alexandria" width={960} height={976} unoptimized />
              <figcaption className={styles.caption}>The Great Library of Alexandria, O. Von Corven, 19th century. Public domain.</figcaption>
            </figure>
            <div>
              <p className={styles.lede}>The first Renaissance was a substrate change. The foundations came back, a few people held the new tools, and patronage paid the makers. All three are moving again.</p>
              <div className={styles.facts}>
                <div className={styles.fact}>
                  <div className={styles.factN}>7</div>
                  <div>branches in the canon</div>
                </div>
                <div className={styles.fact}>
                  <div className={styles.factN}>487</div>
                  <div>science atoms in 8 decks</div>
                </div>
                <div className={styles.fact}>
                  <div className={styles.factN}>$0</div>
                  <div>to read the canon today</div>
                </div>
                <div className={styles.fact}>
                  <div className={styles.factN}>80%+</div>
                  <div>target author share</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="logo" className={`${styles.section} ${styles.dark}`}>
        <div className={styles.wrap}>
          <div className={styles.label}>Logo</div>
          <h2 className={styles.h2}>The lyre and the wordmark</h2>
          <p className={styles.lede}>A lyre with five gold-tipped strings beside a lowercase bucket. over foundation. Download the vector for print and the PNG for screens.</p>
          <div className={styles.logoGrid}>
            {LOGOS.map((l) => (
              <div key={l.file} className={styles.logoCard} style={{ background: l.bg, color: l.ink }}>
                <Image src={`/brand/kit/${l.file}.svg`} alt={l.alt} width={400} height={160} unoptimized />
                <div style={{ fontFamily: "Cinzel, serif", fontWeight: 700 }}>{l.name}</div>
                <div className={styles.dl}>
                  <a href={`/brand/kit/${l.file}.svg`} download>
                    SVG
                  </a>
                  <a href={`/brand/kit/${l.file}.png`} download>
                    PNG 1024
                  </a>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.rules}>
            <div className={styles.clear} style={{ color: "var(--basalt)" }}>
              <div className={styles.clearBox}>
                <Image src="/brand/kit/wordmark.svg" alt="Wordmark inside its clear-space boundary" width={480} height={180} unoptimized />
                <span className={styles.xTag} style={{ top: -30, left: "50%" }}>x</span>
                <span className={styles.xTag} style={{ left: -30, top: "45%" }}>x</span>
              </div>
            </div>
            <div>
              <h3 style={{ fontFamily: "Cinzel, serif", fontSize: 22, margin: "0 0 8px" }}>Clear space</h3>
              <p>Keep x clear on every side, where x is one quarter of the wordmark&apos;s height. Nothing enters that box: no text, no edge, no other mark.</p>
              <h3 style={{ fontFamily: "Cinzel, serif", fontSize: 22, margin: "24px 0 8px" }}>Minimum size</h3>
              <div className={styles.minRow}>
                <div>
                  <Image src="/brand/kit/wordmark-bone.svg" alt="Wordmark at 120 pixels" width={120} height={45} unoptimized />
                  <div className={styles.caption}>Wordmark 120px wide, 25mm in print</div>
                </div>
                <div>
                  <Image src="/brand/kit/lyre-gold.svg" alt="Lyre at 24 pixels" width={21} height={24} unoptimized />
                  <div className={styles.caption}>Lyre 24px tall, 6mm in print</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="color" className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.label}>Color</div>
          <h2 className={styles.h2}>Color tokens</h2>
          <p className={styles.lede}>Tap a swatch to copy its hex. Pages sit on bone, text is basalt, links are aegean, and gold belongs to the lyre and numerals.</p>
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

      <section id="type" className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.label}>Type</div>
          <h2 className={styles.h2}>Typefaces</h2>
          <div className={styles.glyphs} aria-hidden="true">
            Aa Bb Ω 7
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
          <p className={styles.caption}>All four load from Google Fonts. Fraunces runs with SOFT 30, WONK 0 and tabular figures.</p>
        </div>
      </section>

      <section id="voice" className={`${styles.section} ${styles.dark}`}>
        <div className={styles.wrap}>
          <div className={styles.label}>Voice</div>
          <h2 className={styles.h2}>Plain sentences</h2>
          <p className={styles.lede}>Lead with the fact. Numbers carry the claim. No dashes, no intensifiers, and headings name the thing and stop.</p>
          <div className={styles.voiceGrid}>
            {VOICE.map((v) => (
              <div key={v.ok} className={styles.pair}>
                <span className={styles.pairOk}>Write</span>
                <div className={styles.pairText}>{v.ok}</div>
                <span className={styles.pairNo}>Never</span>
                <div className={`${styles.pairText} ${styles.strike}`}>{v.no}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="imagery" className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.label}>Imagery</div>
          <h2 className={styles.h2}>The people who built the foundations</h2>
          <p className={styles.lede}>Public domain paintings and manuscripts of the figures in the canon. Credit the work and its maker every time.</p>
          <div className={styles.gallery}>
            {ART.map((a) => (
              <figure key={a.file}>
                <Image src={`/brand/round2/assets/${a.file}`} alt={a.title} width={480} height={600} unoptimized />
                <figcaption className={styles.caption}>
                  {a.title}. {a.by}. Public domain.
                </figcaption>
              </figure>
            ))}
          </div>
          <div className={styles.screens}>
            {SCREENS.map((s, i) => (
              <Image key={s} src={`/brand/screens/iphone-${i + 1}.jpg`} alt={`Bucket app: ${s}`} width={660} height={1434} unoptimized />
            ))}
          </div>
          <p className={styles.caption}>Bucket for iPhone, App Store screenshots.</p>
        </div>
      </section>

      <section id="usage" className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.label}>Usage</div>
          <h2 className={styles.h2}>Do and don&apos;t</h2>
          <div className={styles.ddGrid}>
            {DOS.map((d) => (
              <div key={d.label} className={styles.dd}>
                <div className={styles.ddStage} style={{ background: d.bg }}>
                  <Image src={d.src} alt={d.label} width={360} height={135} style={d.css} unoptimized />
                </div>
                <div className={styles.ddBody}>
                  <span className={d.ok ? styles.ok : styles.no}>{d.ok ? "DO" : "DON'T"}</span>
                  <span>{d.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="press" className={`${styles.section} ${styles.dark}`}>
        <div className={`${styles.wrap} ${styles.kit}`}>
          <div>
            <div className={styles.label}>Press kit</div>
            <h2 className={styles.h2}>Everything in one download</h2>
            <p className={styles.lede}>Logos in SVG and PNG, app screens, credited imagery and a fact sheet. Press questions go to Gianangelo Dichio, @gianyrox, at gianyrox@gmail.com.</p>
            <div className={styles.ctaRow}>
              <a className={styles.cta} href="/brand/bucket-press-kit.zip" download>
                Download press kit · 2.5 MB
              </a>
            </div>
          </div>
          <ul className={styles.kitList}>
            <li>logos/ · 6 SVG, 6 PNG</li>
            <li>screens/ · 5 iPhone screens</li>
            <li>imagery/ · 8 public domain works and CREDITS.txt</li>
            <li>FACTS.txt · mission, colors, type and logo rules</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

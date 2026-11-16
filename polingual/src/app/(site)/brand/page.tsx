import type { Metadata } from "next";
import { ButtonLink } from "@/ui";
import { Art } from "@/ui/art";
import SectionNav from "./SectionNav";
import { KIT, SECTIONS, StarLattice } from "./parts";
import { StorySection, LogoSection, ColorSection, TypeSection } from "./sections-a";
import { ArtworkSection, PatternsSection, IllustrationSection, MotionSection, VoiceSection, ScreensSection, DownloadsSection } from "./sections-b";
import styles from "./brand.module.css";
import { pageMeta } from "@/lib/meta";

export const metadata: Metadata = pageMeta({ path: "/brand", title: "Polingual Brand", description: "The Polingual brand: the Po mark, colors, type, artwork library, patterns, motion, voice, product screens and a press kit download." });

const FONTS = "https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;500;600;700;800;900&family=Space+Mono:wght@400;700&family=Noto+Sans:wght@400;700;800&family=Noto+Sans+Hebrew:wght@700&family=Noto+Sans+Devanagari:wght@700;800&family=Noto+Sans+SC:wght@700&display=swap";

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

          <StorySection />
          <LogoSection />
          <ColorSection />
          <TypeSection />
          <ArtworkSection />
          <PatternsSection />
          <IllustrationSection />
          <MotionSection />
          <VoiceSection />
          <ScreensSection />
          <DownloadsSection />
        </div>
      </div>
    </main>
  );
}
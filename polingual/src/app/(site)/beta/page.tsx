import type { Metadata } from "next";
import Legal from "@/app/legal";
import { ButtonLink } from "@/ui";
import { TESTFLIGHT_APP_URL, TESTFLIGHT_JOIN_URL } from "@/lib/testflight";
import BetaForm from "./BetaForm";
import styles from "./beta.module.css";

export const metadata: Metadata = {
  title: "Polingual beta on TestFlight",
  description: "Try the next Polingual build on your iPhone before it reaches the App Store.",
  alternates: { canonical: "https://beta.polingual.com/" },
};

const SHOTS = [
  { src: "/beta/learn.webp", alt: "Learn screen with Spanish, French and German together" },
  { src: "/beta/polyword.webp", alt: "Polyword game" },
  { src: "/beta/translate.webp", alt: "One word in five languages" },
];

export default function Page() {
  const siteKey = process.env.TURNSTILE_SITE_KEY?.trim() || null;
  return (
    <Legal>
      <h1 className={styles.title}>Become a beta tester</h1>
      <p className={styles.lede}>Get new Polingual builds before they reach the App Store, and tell us what to fix.</p>
      <ul className={styles.perks}>
        <li>🎮 New games first</li>
        <li>💬 Your feedback shapes the app</li>
      </ul>
      <div className={styles.shots}>
        {SHOTS.map((s) => (
          <img key={s.src} src={s.src} alt={s.alt} width={300} height={652} className={styles.shot} />
        ))}
      </div>
      <ButtonLink href={TESTFLIGHT_JOIN_URL} variant="accent" size="lg" block rel="noopener" data-testid="testflight-join">
        Join on iPhone
      </ButtonLink>
      <div className={styles.need}>
        iPhone · iOS 26 · <a href={TESTFLIGHT_APP_URL} rel="noopener">TestFlight app</a>
      </div>
      {siteKey ? <BetaForm siteKey={siteKey} /> : null}
    </Legal>
  );
}

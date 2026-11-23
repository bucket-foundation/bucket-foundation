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
      <h1 className={styles.title}>Play the beta</h1>
      <div className={styles.shots}>
        {SHOTS.map((s) => (
          <img key={s.src} src={s.src} alt={s.alt} width={300} height={652} className={styles.shot} />
        ))}
      </div>
      <ButtonLink href={TESTFLIGHT_JOIN_URL} variant="accent" size="lg" block rel="noopener" data-testid="testflight-join">
        Join on iPhone
      </ButtonLink>
      <p className={styles.need}>
        iPhone · iOS 26 · <a href={TESTFLIGHT_APP_URL} rel="noopener">TestFlight app</a>
      </p>
      {siteKey ? <BetaForm siteKey={siteKey} /> : null}
    </Legal>
  );
}

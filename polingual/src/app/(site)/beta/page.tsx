import type { Metadata } from "next";
import Legal from "@/app/legal";
import { TESTFLIGHT_APP_URL, TESTFLIGHT_JOIN_URL } from "@/lib/testflight";
import InviteForm from "./InviteForm";
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
  return (
    <Legal>
      <h1 className={styles.title}>Become a beta tester</h1>
      <div className={styles.sub}>Get full access free. Your feedback shapes what we build next.</div>
      <div className={styles.shots}>
        {SHOTS.map((s) => (
          <img key={s.src} src={s.src} alt={s.alt} width={300} height={652} className={styles.shot} />
        ))}
      </div>
      <InviteForm />
      <div className={styles.need}>
        iOS 26 · <a href={TESTFLIGHT_APP_URL} rel="noopener">TestFlight</a> · <a href={TESTFLIGHT_JOIN_URL} rel="noopener">On your iPhone? Join now</a>
      </div>
    </Legal>
  );
}

import type { Metadata } from "next";
import Legal from "@/app/legal";
import { Sheet } from "@/ui";
import { TESTFLIGHT_APP_URL, TESTFLIGHT_JOIN_URL } from "@/lib/testflight";
import BetaForm from "./BetaForm";
import styles from "./beta.module.css";

export const metadata: Metadata = {
  title: "Polingual beta on TestFlight",
  description: "Try the next Polingual build on your iPhone before it reaches the App Store.",
  alternates: { canonical: "https://beta.polingual.com/" },
};

export default function Page() {
  return (
    <Legal>
      <h1>Polingual beta</h1>
      <p className="lede">Try the next Polingual build on your iPhone before it reaches the App Store. Apple sends the invite through TestFlight.</p>
      <p className={styles.need}>You need an iPhone on iOS 26 or later.</p>
      <ol className={styles.steps}>
        <li>
          Get <a href={TESTFLIGHT_APP_URL} rel="noopener">TestFlight</a> from the App Store.
        </li>
        <li>Enter your email below.</li>
        <li>Open the email from Apple on your iPhone and tap View in TestFlight.</li>
      </ol>
      <Sheet className={styles.sheet}>
        <BetaForm siteKey={process.env.TURNSTILE_SITE_KEY?.trim() || null} />
      </Sheet>
      <p className={styles.fallback}>
        No email after ten minutes? Open <a href={TESTFLIGHT_JOIN_URL} rel="noopener">the public TestFlight link</a> on your iPhone.
      </p>
    </Legal>
  );
}

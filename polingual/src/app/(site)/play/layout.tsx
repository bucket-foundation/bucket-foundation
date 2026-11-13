import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { needsConsent } from "@/lib/lobby/ads";
import styles from "../app/app.module.css";
import PlayFrame from "./PlayFrame";

const FONTS = "https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;700;800;900&family=Space+Mono:wght@400;700&family=Noto+Sans:wght@400;700&display=swap";

export const metadata: Metadata = {
  title: "Play",
  description: "Free Polingual game lobbies. Play with friends from the app or a browser with one room code.",
  robots: { index: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F6EEDC", viewportFit: "cover" };

export default async function PlayLayout({ children }: { children: React.ReactNode }) {
  const country = (await headers()).get("x-vercel-ip-country");
  const header = (
    <header className={styles.bar}>
      <a href="/play" className={styles.brand} aria-label="Polingual games">
        <img src="/brand/kit/mark.svg" alt="" width={32} height={32} />
        <span>polingual play</span>
      </a>
      <a href="/app?from=play" className={styles.cta} style={{ minHeight: 40, fontSize: 16, padding: "0 16px" }} data-testid="start-learning">Start learning</a>
    </header>
  );
  return (
    <div className={styles.page}>
      <link rel="stylesheet" href={FONTS} precedence="default" />
      <PlayFrame header={header} consentRequired={needsConsent(country)}>
        {children}
      </PlayFrame>
    </div>
  );
}

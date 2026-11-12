import type { Metadata, Viewport } from "next";
import styles from "../app/app.module.css";

const FONTS = "https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;700;800;900&family=Space+Mono:wght@400;700&family=Noto+Sans:wght@400;700&display=swap";

export const metadata: Metadata = {
  title: "Play",
  description: "Free Polingual game lobbies. Play with friends from the app or a browser with one room code.",
  robots: { index: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F6EEDC" };

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <link rel="stylesheet" href={FONTS} precedence="default" />
      <div className={styles.shell}>
        <header className={styles.bar}>
          <a href="/play" className={styles.brand} aria-label="Polingual games">
            <img src="/brand/kit/mark.svg" alt="" width={32} height={32} />
            <span>polingual play</span>
          </a>
          <a href="/app" className={styles.link}>Learn</a>
        </header>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}

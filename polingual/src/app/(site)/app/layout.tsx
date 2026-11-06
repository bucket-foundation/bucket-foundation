import type { Metadata, Viewport } from "next";
import AppShell from "./AppShell";
import styles from "./app.module.css";

const FONTS = "https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;700;800;900&family=Space+Mono:wght@400;700&family=Noto+Sans:wght@400;700&display=swap";

export const metadata: Metadata = {
  title: "Learn",
  description: "Study several languages at once in the browser with your Polingual account.",
  robots: { index: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F6EEDC" };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <link rel="stylesheet" href={FONTS} precedence="default" />
      <AppShell>{children}</AppShell>
    </div>
  );
}

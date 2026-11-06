import type { Metadata, Viewport } from "next";

const FONTS = "https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;700;800;900&family=Space+Mono:wght@400;700&family=Noto+Sans:wght@400;700&display=swap";

export const metadata: Metadata = {
  title: "Join a live room",
  description: "Enter the room code from the board to play a live Polingual quiz.",
  robots: { index: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F6EEDC" };

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href={FONTS} precedence="default" />
      {children}
    </>
  );
}

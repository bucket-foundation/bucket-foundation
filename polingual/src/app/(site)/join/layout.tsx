import { tokens } from "@/ui/tokens";
import type { Metadata, Viewport } from "next";

const FONTS = "/fonts/stoa/fonts.css";

export const metadata: Metadata = {
  title: "Join a live room",
  description: "Enter the room code from the board to play a live Polingual quiz.",
  robots: { index: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: tokens.color.paper };

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href={FONTS} precedence="default" />
      {children}
    </>
  );
}

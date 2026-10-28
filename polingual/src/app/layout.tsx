import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";

const description = "Polingual teaches several languages at once on iPhone and iPad. 29 languages, one spaced review queue, every word spoken aloud.";

export const metadata: Metadata = {
  title: { default: "Polingual", template: "%s · Polingual" },
  description,
  metadataBase: new URL("https://www.polingual.com"),
  applicationName: "Polingual",
  openGraph: { type: "website", siteName: "Polingual", title: "Polingual", description, url: "https://www.polingual.com", images: [{ url: "/d8/og.png", width: 1200, height: 630, alt: "Polingual word tiles in six scripts" }] },
  twitter: { card: "summary_large_image", images: ["/d8/og.png"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

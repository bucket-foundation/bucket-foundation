import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "polingual — every word in every language, one meaning",
  description:
    "Cross-lingual dictionary built on the photon graph. Definitions in English, surface forms in any language. Semantic + phonetic neighbours across 30+ languages.",
  metadataBase: new URL("https://www.polingual.com"),
  openGraph: {
    type: "website",
    title: "polingual — every word in every language, one meaning",
    description:
      "Cross-lingual dictionary on the photon graph. 40,500+ words across 30+ languages, English-defined.",
    url: "https://www.polingual.com",
  },
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

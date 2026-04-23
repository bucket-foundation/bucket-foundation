import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono } from "next/font/google";

// Paper-like serif; quiet and readable.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-fraunces",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Kruse Index",
  description: "A private preview built for Dr. Jack Kruse by Bucket Foundation.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

/**
 * Covers the root layout's Header/Footer by rendering a full-viewport
 * fixed container. The root layout still emits <Header/> and <Footer/>
 * because we're told not to touch other routes, but this overlay sits
 * above them and isolates the /kruse experience.
 */
export default function KruseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${fraunces.variable} ${jetbrainsMono.variable} fixed inset-0 z-50 overflow-auto`}
      style={{ backgroundColor: "#0b0d0f", color: "#e8e4dc" }}
    >
      {children}
    </div>
  );
}

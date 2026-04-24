import { Fraunces, JetBrains_Mono } from "next/font/google";

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

/**
 * Gated interactive search. Sits above the root layout in a fixed overlay,
 * the same way the original /kruse page used to. Access is enforced by
 * middleware — if you reach this layout, you already have a valid cookie.
 */
export default function KruseSearchLayout({
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

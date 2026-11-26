import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = { title: "Polingual ops", robots: { index: false, follow: false } };

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import "katex/dist/katex.min.css";
import "@/app/globals.css";
import { ROOT_METADATA, ROOT_VIEWPORT } from "@/app/root-meta";

export const metadata: Metadata = ROOT_METADATA;

export const viewport: Viewport = ROOT_VIEWPORT;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

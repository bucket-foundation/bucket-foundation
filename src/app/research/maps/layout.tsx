import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Research maps",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

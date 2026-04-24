import type { Metadata } from "next";

// Web3-gated route — skip static prerender (providers aren't mounted without envs).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Publish research",
  description:
    "Mint primary research as an IP NFT on bucket.foundation — Story Protocol + Walrus. Paid-for-once, citeable-forever.",
  alternates: { canonical: "/research" },
  openGraph: { type: "website", title: "Publish research · bucket.foundation", url: "https://www.bucket.foundation/research" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

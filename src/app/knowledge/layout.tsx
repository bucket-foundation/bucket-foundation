import type { Metadata } from "next";

// Web3-gated route — skip static prerender (providers aren't mounted without envs).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Knowledge",
  description:
    "Your library of minted research and citation tokens on bucket.foundation.",
  alternates: { canonical: "/knowledge" },
  openGraph: { type: "website", title: "Knowledge · bucket.foundation", url: "https://www.bucket.foundation/knowledge" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

// Web3-gated route: Dynamic wallet + Story providers mount here only, and
// the route skips static prerender (the providers need runtime env).
import Web3Providers from "@/providers/Web3Providers";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Knowledge",
  description:
    "Your library of minted research and citation tokens on bucket.foundation.",
  alternates: { canonical: "/knowledge" },
  openGraph: { type: "website", title: "Knowledge · bucket.foundation", url: "https://www.bucket.foundation/knowledge" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <Web3Providers>{children}</Web3Providers>;
}

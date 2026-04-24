import type { Metadata } from "next";

// The /kruse path has two faces:
//   - /kruse         : public stone-bone preview (inherits root layout fully).
//   - /kruse/search  : gated interactive app (applies its own dark overlay).
// This layout is deliberately minimal so the public preview sits in the same
// chrome as the rest of the site.

export const metadata: Metadata = {
  title: "The Kruse Index",
  description:
    "Private preview built for Dr. Jack Kruse by Bucket Foundation. 460 articles, three retrieval modes, one search bar.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
  alternates: { canonical: "/kruse" },
  openGraph: {
    type: "website",
    title: "The Kruse Index · Bucket Foundation",
    url: "https://www.bucket.foundation/kruse",
  },
};

export default function KruseLayout({ children }: { children: React.ReactNode }) {
  return children;
}

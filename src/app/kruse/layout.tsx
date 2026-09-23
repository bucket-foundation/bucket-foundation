import type { Metadata } from "next";

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

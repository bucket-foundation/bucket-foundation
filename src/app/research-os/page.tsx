import type { Metadata } from "next";
import HomeVariant from "@/components/research-os/HomeVariant";
import { findVariant } from "@/lib/research-os/home-variants";
import { RESEARCH_ORIGIN } from "@/lib/research-host";

export const metadata: Metadata = {
  title: "Research OS for K-12 · find, quote, check, organize",
  description:
    "A student research workspace over Bucket's knowledge graph. The AI finds sources, quotes them with provenance, checks claims against quotes, and organizes evidence. It never writes the answer. Five learner states per concept, a teacher class view, and student productions that become citable nodes.",
  alternates: { canonical: RESEARCH_ORIGIN },
  openGraph: {
    type: "website",
    url: RESEARCH_ORIGIN,
    title: "Research OS for K-12 · bucket.foundation",
    description:
      "Find, quote, check, organize. Five learner states per concept. Student productions that enter the graph as citable nodes.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Research OS for K-12 · bucket.foundation",
    description:
      "A research workspace for school-age learners where the AI never writes the answer.",
  },
};

const LANDING = findVariant("v07")!;

export default function ResearchOsPage() {
  return <HomeVariant v={LANDING} />;
}

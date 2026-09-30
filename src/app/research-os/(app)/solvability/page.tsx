import type { Metadata } from "next";
import atlas from "@/lib/research-os/solvability-atlas-data.json";
import type { SolvabilityAtlasData } from "@/lib/research-os/solvability-atlas";
import SolvabilityAtlas from "@/components/research-os/views/SolvabilityAtlas";

export const metadata: Metadata = { title: "Solvability", robots: { index: false, follow: false } };

export default function SolvabilityPage() {
  return <SolvabilityAtlas data={atlas as SolvabilityAtlasData} />;
}

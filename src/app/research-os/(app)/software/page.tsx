import type { Metadata } from "next";
import atlas from "@/lib/research-os/software-atlas-data.json";
import type { SoftwareAtlasData } from "@/lib/research-os/software-atlas";
import SoftwareAtlas from "./SoftwareAtlas";

export const metadata: Metadata = { title: "Software", robots: { index: false, follow: false } };

export default function SoftwarePage() {
  return <SoftwareAtlas data={atlas as SoftwareAtlasData} />;
}

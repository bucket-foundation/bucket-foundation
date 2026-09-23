import type { Metadata } from "next";
import atlas from "@/lib/research-os/software-atlas-data.json";
import type { SoftwareAtlasData } from "@/lib/research-os/software-atlas";
import SoftwareAtlas from "./SoftwareAtlas";

export const metadata: Metadata = { title: "Software", robots: { index: false, follow: false } };

/**
 * The software atlas (learning/research-os/SOFTWARE-ATLAS.md, ros-workbench 0)
 * as a working page: every tool a science uses, how Research OS reaches it,
 * and where the research tools suite runs. The data is built from the memo by
 * scripts/research-os/software-atlas.mjs.
 */
export default function SoftwarePage() {
  return <SoftwareAtlas data={atlas as SoftwareAtlasData} />;
}

import type { Metadata } from "next";
import { headers } from "next/headers";
import { detectOs } from "@/lib/download/release";
import { fetchLatestReleaseV2 } from "@/lib/download/release-v2";
import DownloadFlowV3 from "./DownloadFlowV3";

export const metadata: Metadata = {
  title: "Download",
  description: "Get the Bucket desktop app for offline study.",
  alternates: { canonical: "/download" },
};

export default async function DownloadPage() {
  const ua = (await headers()).get("user-agent");
  const os = detectOs(ua);
  const release = await fetchLatestReleaseV2();
  const installers = release ? release.installers : [];
  const windowed = release ? release.windowed : [];

  return (
    <main className="stone-bone relative grain">
      <div className="max-w-[640px] mx-auto px-4 md:px-6 py-14 md:py-28">
        <h1 className="font-display uppercase text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] chisel text-[color:var(--basalt)]">
          bucket on <span className="inlay-gold">your computer.</span>
        </h1>
        <DownloadFlowV3 detected={os} installers={installers} windowed={windowed} />
      </div>
    </main>
  );
}

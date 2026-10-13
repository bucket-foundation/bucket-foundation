import type { Metadata } from "next";
import { headers } from "next/headers";
import { detectOs } from "@/lib/download/release";
import { fetchLatestReleaseV2 } from "@/lib/download/release-v2";
import DownloadExperience from "@/components/download/DownloadExperience";

export const metadata: Metadata = {
  title: "Download",
  description: "Try a sample research workspace, watch Bucket in action, and download the desktop app.",
  alternates: { canonical: "/download" },
};

export default async function DownloadPage() {
  const ua = (await headers()).get("user-agent");
  const os = detectOs(ua);
  const release = await fetchLatestReleaseV2();
  const installers = release ? release.installers : [];
  const windowed = release ? release.windowed : [];

  return (
    <DownloadExperience detected={os} installers={installers} windowed={windowed} />
  );
}

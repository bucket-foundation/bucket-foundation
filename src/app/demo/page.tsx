import type { Metadata } from "next";
import { headers } from "next/headers";
import { detectOs } from "@/lib/download/release";
import { allLinks, detectFromHints, testflightUrl } from "@/lib/download/device";
import { fetchLatestReleaseV2 } from "@/lib/download/release-v2";
import DemoExperience from "@/components/download/DemoExperience";

export const metadata: Metadata = {
  title: "Try Bucket",
  description: "Explore a sample Bucket workspace in your browser. Follow a question from a coin toss to a source and a note.",
  alternates: { canonical: "/demo" },
};

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const h = await headers();
  const ua = h.get("user-agent");
  const os = detectOs(ua);
  const release = await fetchLatestReleaseV2();
  const installers = release ? release.installers : [];
  const windowed = release ? release.windowed : [];
  const device = detectFromHints(ua, h.get("sec-ch-ua-platform"), h.get("sec-ch-ua-arch"));
  const links = allLinks({ windowed, apk: release?.apk ?? null, testflight: testflightUrl(process.env.BUCKET_TESTFLIGHT_URL) });

  return <DemoExperience detected={os} installers={installers} windowed={windowed} device={device} links={links} />;
}

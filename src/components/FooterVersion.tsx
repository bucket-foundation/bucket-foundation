import pkg from "../../package.json";
import { fetchLatestRelease } from "@/lib/download/release";
import { siteVersion } from "@/lib/download/install";

export default async function FooterVersion() {
  const release = await fetchLatestRelease();
  return <>{siteVersion(release?.tag, pkg.version)}</>;
}

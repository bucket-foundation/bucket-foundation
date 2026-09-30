import pkg from "../../package.json";
import { fetchLatestRelease } from "@/lib/download/release";
import { siteVersion } from "@/lib/site-version";

export default async function FooterVersion() {
  const release = await fetchLatestRelease();
  return <>{siteVersion(release?.tag, pkg.version)}</>;
}

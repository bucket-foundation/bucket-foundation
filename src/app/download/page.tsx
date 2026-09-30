import type { Metadata } from "next";
import { headers } from "next/headers";
import { CONTACT_EMAIL, mailto } from "@/lib/support";
import { RELEASES_PAGE, detectOs } from "@/lib/download/release";
import { fetchLatestReleaseV2 } from "@/lib/download/release-v2";
import DownloadFlowV2 from "./DownloadFlowV2";

export const metadata: Metadata = {
  title: "Download",
  description: "Get the Bucket desktop app for offline study.",
  alternates: { canonical: "/download" },
};

const P = "mt-4 text-[16px] leading-[1.75] text-[color:var(--basalt-2)]";

export default async function DownloadPage() {
  const os = detectOs((await headers()).get("user-agent"));
  const release = await fetchLatestReleaseV2();
  const installers = release ? release.installers : [];

  return (
    <main className="stone-bone relative grain">
      <div className="max-w-[640px] mx-auto px-4 md:px-6 py-14 md:py-28">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">§ Download</div>
        <h1 className="font-display uppercase text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] chisel text-[color:var(--basalt)]">
          bucket on <span className="inlay-gold">your computer.</span>
        </h1>
        <p className={P}>
          The desktop app runs offline: learn, review and quiz without a connection. It opens on your first quiz. Every release is signed; the installer checks the signature before it installs.
        </p>

        <section aria-labelledby="installers" className="mt-8">
          <h2 id="installers" className="small-caps text-[11px] tracking-[0.2em] text-[color:var(--basalt)]">
            {release ? release.name : "latest release"}
          </h2>
          <p className={P}>
            Sign up in three short steps and we show the install command for your computer. Each field says why we ask. The installers are public on the releases page; signing up gets you release notices and a link by email.
          </p>
          <DownloadFlowV2 detected={os} installers={installers} />
          <p className="mt-4 text-[13px] text-[color:var(--basalt-2)]">
            <a className="underline" href={release?.page ?? RELEASES_PAGE}>All releases, checksums and signatures</a>
          </p>
        </section>

        <h2 className="mt-12 small-caps text-[11px] tracking-[0.2em] text-[color:var(--basalt)]">what we keep</h2>
        <p className={P}>
          Your email, the name you give, your role and research if you add them, the computer you pick, your update choices, and the time of each request. We keep it in private storage and use it for the download link and the notices you chose. We delete it 12 months after your last request, and sooner on request: write to{" "}
          <a className="underline" href={mailto("Delete my download request")}>{CONTACT_EMAIL}</a>.
        </p>
      </div>
    </main>
  );
}

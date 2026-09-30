import type { Metadata } from "next";
import { headers } from "next/headers";
import { CONTACT_EMAIL, mailto } from "@/lib/support";
import { OS_LABEL, RELEASES_PAGE, detectOs, fetchLatestRelease, installerArch, macArch, megabytes, orderFor } from "@/lib/download/release";
import DownloadForm from "./DownloadForm";

export const metadata: Metadata = {
  title: "Download",
  description: "Get the Bucket desktop app for offline study.",
  alternates: { canonical: "/download" },
};

const P = "mt-4 text-[16px] leading-[1.75] text-[color:var(--basalt-2)]";
const PRIMARY =
  "flex items-center justify-between gap-3 px-6 py-4 min-h-[44px] bg-[color:var(--basalt)] text-[color:var(--bone)] hover:bg-[color:var(--aegean-deep)] transition small-caps text-[12px] tracking-[0.14em]";
const SECONDARY =
  "flex items-center justify-between gap-3 px-6 py-3 min-h-[44px] border border-[color:var(--hairline)] text-[color:var(--basalt)] hover:border-[color:var(--gold-deep)] transition small-caps text-[11px] tracking-[0.14em]";

export default async function DownloadPage() {
  const h = await headers();
  const os = detectOs(h.get("user-agent"));
  const release = await fetchLatestRelease(fetch, macArch(h.get("sec-ch-ua-arch")));
  const installers = release ? orderFor(os, release.installers) : [];
  const mine = installers.find((i) => i.os === os);

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
          {installers.length > 0 ? (
            <ul className="mt-4 flex flex-col gap-3">
              {installers.map((i) => (
                <li key={i.name}>
                  <a href={i.url} className={i === mine ? PRIMARY : SECONDARY} data-os={i.os}>
                    <span>Download for {OS_LABEL[i.os]}{installerArch(i) ? ` ${installerArch(i)}` : ""}</span>
                    <span className="normal-case tracking-normal text-[12px] opacity-80">{megabytes(i.size)}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className={P}>
              Linux AppImage coming. macOS and Windows builds follow. Leave your email below and we send a link when your installer is ready.
            </p>
          )}
          {os && installers.length > 0 && !mine && (
            <p className="mt-3 text-[13px] text-[color:var(--basalt-2)]">No {OS_LABEL[os]} build yet. The builds above are for other systems.</p>
          )}
          <p className="mt-4 text-[13px] text-[color:var(--basalt-2)]">
            <a className="underline" href={release?.page ?? RELEASES_PAGE}>All releases, checksums and signatures</a>
          </p>
        </section>

        <h2 className="mt-12 small-caps text-[11px] tracking-[0.2em] text-[color:var(--basalt)]">
          {installers.length > 0 ? "or get the link by email" : "get the link by email"}
        </h2>
        <p className={P}>
          Leave your email and we send a download link that works for 24 hours, plus a note when a new release ships.
        </p>
        <DownloadForm />
        <h2 className="mt-12 small-caps text-[11px] tracking-[0.2em] text-[color:var(--basalt)]">what we keep</h2>
        <p className={P}>
          Your email, the name you give, the computer you pick, and the time of each request. We keep it in private storage and use it for the download link and release notices. We delete it 12 months after your last request, and sooner on request: write to{" "}
          <a className="underline" href={mailto("Delete my download request")}>{CONTACT_EMAIL}</a>.
        </p>
      </div>
    </main>
  );
}

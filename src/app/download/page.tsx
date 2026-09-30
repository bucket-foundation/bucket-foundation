import type { Metadata } from "next";
import { headers } from "next/headers";
import { CONTACT_EMAIL, mailto } from "@/lib/support";
import CopyBlock from "@/components/CopyBlock";
import { APPIMAGE_RUN_STEPS, APPIMAGE_WARNING, INSTALL_COMMAND, INSTALL_SHELL } from "@/lib/download/install";
import { OSES, OS_LABEL, RELEASES_PAGE, detectOs, fetchLatestRelease, megabytes } from "@/lib/download/release";
import DownloadForm from "./DownloadForm";

export const metadata: Metadata = {
  title: "Download",
  description: "Get the Bucket desktop app for offline study.",
  alternates: { canonical: "/download" },
};

const P = "mt-4 text-[16px] leading-[1.75] text-[color:var(--basalt-2)]";
const SECONDARY =
  "flex items-center justify-between gap-3 px-6 py-3 min-h-[44px] border border-[color:var(--hairline)] text-[color:var(--basalt)] hover:border-[color:var(--gold-deep)] transition small-caps text-[11px] tracking-[0.14em]";

export default async function DownloadPage() {
  const os = detectOs((await headers()).get("user-agent"));
  const release = await fetchLatestRelease();
  const installers = release ? release.installers : [];
  const order = [...OSES].sort((a, b) => Number(b === os) - Number(a === os));

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
          {release ? (
            <div className="mt-4 flex flex-col gap-8">
              {order.map((o) => {
                const direct = installers.find((i) => i.os === o);
                return (
                  <div key={o} data-os={o} className="flex flex-col gap-3">
                    <h3 className={o === os ? "small-caps text-[12px] tracking-[0.14em] text-[color:var(--aegean-deep)]" : "small-caps text-[11px] tracking-[0.14em] text-[color:var(--basalt-2)]"}>
                      {OS_LABEL[o]}
                    </h3>
                    <p className="text-[13px] text-[color:var(--basalt-2)]">Paste this into {INSTALL_SHELL[o]}. It checks the signature before it installs.</p>
                    <CopyBlock text={INSTALL_COMMAND[o]} label={`${OS_LABEL[o]} install command`} />
                    {direct && (
                      <a href={direct.url} className={SECONDARY} data-direct={o}>
                        <span>{o === "linux" ? "or download the AppImage" : `or download the ${OS_LABEL[o]} installer`}</span>
                        <span className="normal-case tracking-normal text-[12px] opacity-80">{megabytes(direct.size)}</span>
                      </a>
                    )}
                    {direct && o === "linux" && /\.AppImage$/i.test(direct.name) && (
                      <div className="flex flex-col gap-2" data-appimage-run>
                        <CopyBlock text={APPIMAGE_RUN_STEPS.join("\n")} label="AppImage run commands" />
                        <p className="text-[13px] text-[color:var(--basalt)]" role="note">{APPIMAGE_WARNING}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={P}>
              Installers are being published. Leave your email below and we send a link when your installer is ready.
            </p>
          )}
          <p className="mt-4 text-[13px] text-[color:var(--basalt-2)]">
            <a className="underline" href={release?.page ?? RELEASES_PAGE}>All releases, checksums and signatures</a>
          </p>
        </section>

        <h2 className="mt-12 small-caps text-[11px] tracking-[0.2em] text-[color:var(--basalt)]">
          {release ? "or get the link by email" : "get the link by email"}
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

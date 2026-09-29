import type { Metadata } from "next";
import { CONTACT_EMAIL, mailto } from "@/lib/support";
import DownloadForm from "./DownloadForm";

export const metadata: Metadata = {
  title: "Download",
  description: "Get the Bucket desktop app for offline study.",
  alternates: { canonical: "/download" },
};

const P = "mt-4 text-[16px] leading-[1.75] text-[color:var(--basalt-2)]";

export default function DownloadPage() {
  return (
    <main className="stone-bone relative grain">
      <div className="max-w-[640px] mx-auto px-4 md:px-6 py-14 md:py-28">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">§ Download</div>
        <h1 className="font-display uppercase text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] chisel text-[color:var(--basalt)]">
          bucket on <span className="inlay-gold">your computer.</span>
        </h1>
        <p className={P}>
          The desktop app runs offline: learn, review and quiz without a connection. Leave your email. Once a release is published, we email you a download link that works for 24 hours. Every release is signed; the installer checks the signature before it installs.
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

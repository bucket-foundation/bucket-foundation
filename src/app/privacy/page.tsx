import Link from "next/link";
import type { Metadata } from "next";
import { CONTACT_EMAIL, mailto } from "@/lib/support";
import { CONSENT_VERSION, RETENTION_MONTHS } from "@/lib/download/core";
import { COLLECTED, DOWNLOAD_STORED, EVENTS, PRIVACY_DRAFT, PROCESSORS } from "@/lib/privacy-notice";

export const metadata: Metadata = {
  title: PRIVACY_DRAFT ? "Privacy · draft" : "Privacy",
  description: "What Bucket Foundation stores when you request the desktop app or sign in and study, why, and how to export or delete it.",
  alternates: { canonical: "/privacy" },
  robots: { index: !PRIVACY_DRAFT, follow: !PRIVACY_DRAFT },
};

const LABEL = "small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]";
const H2 = "mt-14 font-display uppercase text-[22px] tracking-[0.04em] text-[color:var(--basalt)]";
const P = "mt-4 text-[17px] leading-[1.75] text-[color:var(--basalt-2)]";

export default function PrivacyPage() {
  return (
    <main className="stone-bone relative grain">
      <div className="max-w-[860px] mx-auto px-4 md:px-6 py-14 md:py-32">
        {PRIVACY_DRAFT && (
          <div role="note" className="mb-10 border border-[color:var(--crimson)] px-4 py-3 text-[14px] leading-[1.6] text-[color:var(--crimson)]">
            <strong className="small-caps tracking-[0.14em]">draft</strong> This notice waits on founder approval. Its wording may change before launch.
          </div>
        )}
        <div className={`${LABEL} mb-5`}>§ Privacy</div>
        <h1 className="font-display uppercase text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          what we keep <span className="inlay-gold">and why.</span>
        </h1>
        <p className={P}>
          Bucket Foundation makes the Bucket desktop app and Learn, a study app for the science canon. A download request and a Learn account each leave the records on this page. We sell no data and run no ads.
        </p>

        <h2 className={H2}>download requests</h2>
        <p className={P}>
          The form at <Link href="/download" className="underline underline-offset-4">/download</Link> stores one record for each email address, in private storage on Vercel Blob. We use it to send the download link and the email you chose.
        </p>
        <dl className="mt-7 flex flex-col gap-px bg-[color:var(--hairline)] grid-hairlines">
          {DOWNLOAD_STORED.map((d) => (
            <div key={d.what} className="bg-[color:var(--bone)] p-6 md:p-7">
              <dt className="font-display uppercase text-[18px] tracking-[0.04em] text-[color:var(--basalt)]">{d.what}</dt>
              <dd className="mt-3 text-[15px] leading-[1.7] text-[color:var(--basalt-2)]">{d.detail}</dd>
            </div>
          ))}
        </dl>
        <p className={P}>
          The terms version stored with a request today is <code className="font-mono text-[14px]">{CONSENT_VERSION}</code>.
        </p>
        <p className={P}>
          Resend emails you a download link. The link works for 24 hours, and for 10 minutes after its first use. One address gets one link an hour. A second message, with your email and the time of the request, goes to the founder&apos;s inbox.
        </p>
        <p className={P}>
          If you tick the daily digest, Resend emails you each day&apos;s What&apos;s New entries. Every digest carries an unsubscribe link, and unsubscribing stores a keyed hash of your address and the time so the digest stays off. The release notes choice is stored, and the site sends no release notes yet.
        </p>
        <p className={P}>
          To limit abuse we count requests from each IP address and allow five a minute. Each count is stored under a hash of the IP address and the minute. A daily job deletes counts older than 25 hours, along with the marks that record a sent link and a used link. A request that fills the hidden spam-trap field is stored apart, with the same fields, and gets no email.
        </p>
        <p className={P}>
          A daily job deletes a download record {RETENTION_MONTHS} months after your last request. To have it deleted sooner, write to{" "}
          <a className="underline underline-offset-4" href={mailto("Delete my download request")}>{CONTACT_EMAIL}</a>
          {" "}and we remove the stored record for your address. The message in the founder&apos;s inbox and the send log Resend keeps sit outside that job.
        </p>

        <h2 className={H2}>what learn keeps</h2>
        <dl className="mt-7 flex flex-col gap-px bg-[color:var(--hairline)] grid-hairlines">
          {COLLECTED.map((c) => (
            <div key={c.what} className="bg-[color:var(--bone)] p-6 md:p-7">
              <dt className="font-display uppercase text-[18px] tracking-[0.04em] text-[color:var(--basalt)]">{c.what}</dt>
              <dd className="mt-3 text-[15px] leading-[1.7] text-[color:var(--basalt-2)]">{c.detail}</dd>
              <dd className="mt-2 text-[15px] leading-[1.7] text-[color:var(--basalt-2)]">
                <span className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">why </span>
                {c.why}
              </dd>
            </div>
          ))}
        </dl>

        <h2 className={H2}>the events</h2>
        <ul className="mt-6 border-t border-[color:var(--hairline)]">
          {EVENTS.map((e) => (
            <li key={e.name} className="border-b border-[color:var(--hairline)] py-3 flex flex-wrap gap-x-4 gap-y-1">
              <code className="font-mono text-[13px] text-[color:var(--basalt)] min-w-[180px]">{e.name}</code>
              <span className="text-[15px] leading-[1.6] text-[color:var(--basalt-2)] flex-1">{e.when}</span>
            </li>
          ))}
        </ul>
        <p className={P}>Our servers write these records. The page you study on cannot add to them.</p>

        <h2 className={H2}>page visits</h2>
        <p className={P}>
          Vercel Web Analytics counts which pages are opened, from the home page through sign-in to placement. It sets no cookies and keeps no account link.
        </p>

        <h2 className={H2}>the tutor study</h2>
        <p className={P}>
          The tutor is off at launch. When it opens, we will run a study comparing tutor styles. Joining it takes a separate yes on its own screen, and one button takes you out again. Nobody under 18 is enrolled.
        </p>

        <h2 className={H2}>who handles it</h2>
        <ul className="mt-6 border-t border-[color:var(--hairline)]">
          {PROCESSORS.map((p) => (
            <li key={p.name} className="border-b border-[color:var(--hairline)] py-3 flex flex-wrap gap-x-4 gap-y-1">
              <span className="text-[15px] text-[color:var(--basalt)] min-w-[180px]">{p.name}</span>
              <span className="text-[15px] leading-[1.6] text-[color:var(--basalt-2)] flex-1">{p.role}</span>
            </li>
          ))}
        </ul>

        <h2 className={H2}>export and delete</h2>
        <p className={P}>
          From your <Link href="/research-os/profile" className="underline underline-offset-4">profile</Link>, you can download every record we keep about your learning as one file, or delete those records. Deleting removes your progress, profile answers, events and credentials. To close the account and remove your email as well, write to us.
        </p>

        <h2 className={H2}>contact</h2>
        <p className={P}>
          Questions or requests go to{" "}
          <a href={mailto("Privacy")} className="underline underline-offset-4 break-words">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </div>
    </main>
  );
}

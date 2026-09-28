import type { Metadata } from "next";
import RemoveAdvisorForm from "./RemoveAdvisorForm";

export const metadata: Metadata = { title: "Remove an advisor profile", robots: { index: false, follow: false } };

export default function RemoveAdvisorPage() {
  return (
    <main className="mx-auto max-w-[640px] px-4 py-10 md:px-8">
      <p className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">Bucket Foundation</p>
      <h1 className="font-display text-[clamp(1.6rem,4vw,2.2rem)] leading-[1.1] text-[color:var(--basalt)]">Remove an advisor profile</h1>
      <p className="mt-3 text-[14px] text-[color:var(--basalt-2)]">
        Research OS helps signed-in adults find advisors whose published topics are close to their own. A profile shows a name, an institution, a country,
        OpenAlex topics and links to OpenAlex, ORCID and the institution. It shows no email. Ask here and the profile is hidden at once, or within a day when requests run high, and stays out of
        every later load. A maintainer reads each request and writes back to the contact you give.
      </p>
      <RemoveAdvisorForm />
    </main>
  );
}

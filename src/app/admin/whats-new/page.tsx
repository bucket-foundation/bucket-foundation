import type { Metadata } from "next";
import DraftsAdmin from "./DraftsAdmin";

export const metadata: Metadata = {
  title: "What's New drafts",
  robots: { index: false, follow: false },
};

export default function WhatsNewDraftsPage() {
  return (
    <main className="px-4 md:px-6 pt-10 md:pt-16 pb-16">
      <div className="mx-auto w-full max-w-[1100px]">
        <h1 className="font-display uppercase text-[clamp(1.5rem,4vw,2rem)] leading-[1.1] chisel text-[color:var(--basalt)]">What&apos;s New drafts</h1>
        <DraftsAdmin />
      </div>
    </main>
  );
}

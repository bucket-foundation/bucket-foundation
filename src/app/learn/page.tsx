import type { Metadata } from "next";
import Script from "next/script";
import LearnTabs from "./LearnTabs";

export const metadata: Metadata = {
  title: "Learn with Claude · reformative education",
  description:
    "Educate yourself. Reform the stack. Bucket is a nonprofit rewiring publishing, citation, and authorship — and you learn by doing, with your own Claude key.",
  alternates: { canonical: "/learn" },
  openGraph: {
    title: "bucket.foundation — learn with Claude",
    description:
      "BYO Anthropic key. BYO Claude. BYO corpus. The only thing we gate is citation, and citation pays the author forever.",
    url: "https://www.bucket.foundation/learn",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "bucket.foundation — learn with Claude",
    description:
      "Reformative education. Your key, your Claude, your corpus. We host the rail.",
  },
};

const LEARNING_RESOURCE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  "@id": "https://www.bucket.foundation/learn",
  name: "Learn with Claude — reformative education",
  description:
    "A hands-on entry point to bucket.foundation: learn why the incumbent publishing system is structurally extractive, and how feed402 pays original authors forever.",
  url: "https://www.bucket.foundation/learn",
  learningResourceType: [
    "InteractiveTutorial",
    "Tutorial",
    "Reference",
  ],
  educationalUse: ["self-study", "research", "professional development"],
  educationalLevel: "advanced",
  teaches: [
    "gated academic publishing economics",
    "pay-once-cite-forever citation model",
    "feed402 + x402 protocol",
    "canon of foundations (7 branches)",
    "cite-forever license",
    "nonprofit research infrastructure",
  ],
  isAccessibleForFree: true,
  license: "https://www.bucket.foundation/cite-forever/v0.1",
  inLanguage: "en-US",
  creator: { "@id": "https://www.bucket.foundation#org" },
  audience: {
    "@type": "EducationalAudience",
    educationalRole: ["researcher", "engineer", "student", "author"],
  },
};

export default function LearnPage() {
  return (
    <main className="min-h-screen">
      <Script
        id="ld-learn"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(LEARNING_RESOURCE_JSONLD),
        }}
      />

      {/* thin strip */}
      <div className="w-full border-b border-[color:var(--hairline)] bg-[color:var(--bone-2)]/80">
        <div className="max-w-[1200px] mx-auto px-6 py-3 text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-2)]">
          <span className="text-[color:var(--gold-deep)]">§</span> reformative
          education — bucket is a nonprofit. Every feature on this page runs
          on <span className="text-[color:var(--basalt)]">your</span> key,{" "}
          <span className="text-[color:var(--basalt)]">your</span> Claude,{" "}
          <span className="text-[color:var(--basalt)]">your</span> corpus. We
          host the rail. You own the learning.
        </div>
      </div>

      <section className="max-w-[1200px] mx-auto px-6 pt-14 pb-10">
        <div className="small-caps text-[10px] text-[color:var(--gold-deep)] tracking-[0.2em]">
          § V · reformative education
        </div>
        <h1 className="mt-4 font-display uppercase text-[clamp(2rem,5vw,3.6rem)] leading-[1.04] text-[color:var(--basalt)]">
          Educate yourself.
          <span className="block ed-italic text-[color:var(--aegean-deep)] font-light mt-1">
            Reform the stack.
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-[16px] leading-[1.7] text-[color:var(--basalt-2)]">
          Publishing is gated. Citation is dead. Authorship is unpaid. Bucket
          rewires all three — and you learn by doing, with your own Claude.
        </p>
      </section>

      <LearnTabs />
    </main>
  );
}

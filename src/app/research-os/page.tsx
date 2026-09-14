import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import FixedCanonGlobeBackground from "@/components/FixedCanonGlobeBackground";

// /research-os, Research OS for K-12 (beads ros-01 to ros-10). The
// production-reaching path for the L1 rung of the depth ladder: a student
// workspace where the AI only finds, quotes, checks, and organizes over the
// Concept Atom graph; five learner states per atom; frontier-backward routing;
// a teacher class view; accepted student productions become citable nodes the
// hypothesis engine can consume. Plan: learning/research-os/PLAN.md.

export const metadata: Metadata = {
  title: "Research OS for K-12 · find, quote, check, organize",
  description:
    "A student research workspace over Bucket's knowledge graph. The AI finds sources, quotes them with provenance, checks claims against quotes, and organizes evidence. It never writes the answer. Five learner states per concept, a teacher class view, and student productions that become citable nodes.",
  alternates: { canonical: "/research-os" },
  openGraph: {
    type: "website",
    url: "https://www.bucket.foundation/research-os",
    title: "Research OS for K-12 · bucket.foundation",
    description:
      "Find, quote, check, organize. Five learner states per concept. Student productions that enter the graph as citable nodes.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Research OS for K-12 · bucket.foundation",
    description:
      "A research workspace for school-age learners where the AI never writes the answer.",
  },
};

const STATES: { name: string; meaning: string; signal: string }[] = [
  {
    name: "Access",
    meaning: "The concept is reachable. Its prerequisites are understood and the learner has opened it.",
    signal: "Route exposure and an open event.",
  },
  {
    name: "Awareness",
    meaning: "The learner can recall the concept's claim and place it in the graph.",
    signal: "Spaced-repetition retrievability above the Academy recall threshold.",
  },
  {
    name: "Understanding",
    meaning: "The learner can apply or explain the concept in a fresh context.",
    signal: "A constructive task passed: self-explanation, a worked example, or a quote-and-check task.",
  },
  {
    name: "Internalization",
    meaning: "The concept holds over time and transfers.",
    signal: "Memory stability above threshold and a delayed transfer item passed.",
  },
  {
    name: "Production",
    meaning: "The learner produced a claim with evidence and citations that reviewers accepted into the graph.",
    signal: "A reviewed production record with a citable id.",
  },
];

// One screenshot per state, same order as STATES, captured live from this
// dev server. The Supabase-gated routes (class, review) render their own
// unavailable message with no Supabase keys configured locally; that is
// a real screenshot of the shipped fallback, labeled as such in the alt
// text below.
const STATE_SCREENSHOTS: { src: string; alt: string; route: string; label: string }[] = [
  {
    src: "/research-os/state-access.png",
    alt: "The Research OS for K-12 overview page, reachable to any visitor.",
    route: "/research-os",
    label: "the overview",
  },
  {
    src: "/research-os/state-awareness.png",
    alt: "The canon search page, where a learner opens a node for the first time.",
    route: "/canon/search",
    label: "canon search",
  },
  {
    src: "/research-os/state-understanding.png",
    alt: "The Research OS workspace, where a learner writes and checks an explanation.",
    route: "/research-os/workspace",
    label: "the workspace",
  },
  {
    src: "/research-os/state-internalization.png",
    alt: "The Research OS class view, showing its unavailable message with no Supabase configured locally.",
    route: "/research-os/class",
    label: "the class view",
  },
  {
    src: "/research-os/state-production.png",
    alt: "The Research OS teacher review queue, showing its unavailable message with no Supabase configured locally.",
    route: "/research-os/review",
    label: "the review queue",
  },
];

export default function ResearchOsPage() {
  return (
    <>
      <FixedCanonGlobeBackground />
      <main className="stone-bone relative z-10 grain">
      <div className="max-w-[1100px] mx-auto px-4 md:px-6 pt-14 md:pt-32 pb-6">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          § Research OS · K-12
        </div>
        <h1 className="font-display uppercase text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          Research OS <span className="inlay-gold">for K-12</span>
        </h1>
        <p className="mt-7 text-[17px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Where students of all levels access, become aware of, understand,
          internalize, and produce knowledge.
        </p>
        <div className="mt-6">
          <Link
            href="/research-os/workspace"
            className="inline-block px-5 py-3 text-[12px] small-caps tracking-[0.14em] bg-[color:var(--gold)] text-[color:var(--basalt)]"
          >
            Try the prototype →
          </Link>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* FIVE STATES · alternating rows, Access through Production      */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-10 md:py-16">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-10">
          § five states
        </div>
        <div className="flex flex-col gap-16 md:gap-24">
          {STATES.map((s, i) => {
            const shot = STATE_SCREENSHOTS[i];
            const imageRight = i % 2 === 0;
            return (
              <div
                key={s.name}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 items-center"
              >
                <div className={imageRight ? "md:order-1" : "md:order-2"}>
                  <div className="font-display text-[color:var(--gold-deep)] text-[15px] mb-3">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="font-display uppercase text-[26px] md:text-[32px] tracking-[0.02em] text-[color:var(--basalt)] mb-4">
                    {s.name}
                  </h3>
                  <p className="text-[15px] leading-[1.75] text-[color:var(--basalt-2)] max-w-md">
                    {s.meaning}
                  </p>
                  <Link
                    href={shot.route}
                    className="mt-5 inline-block small-caps text-[11px] tracking-[0.14em] text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
                  >
                    view {shot.label} →
                  </Link>
                </div>
                <div className={imageRight ? "md:order-2" : "md:order-1"}>
                  <Image
                    src={shot.src}
                    alt={shot.alt}
                    width={960}
                    height={600}
                    sizes="(min-width: 768px) 50vw, 100vw"
                    // The first row's image is the page's LCP element;
                    // mark it priority so Next preloads it instead of
                    // lazy-loading a hero-sized image below the fold check.
                    priority={i === 0}
                    className="w-full h-auto rounded-md border border-[color:var(--hairline)] shadow-[0_2px_24px_-6px_rgba(31,28,22,0.12)]"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </main>
    </>
  );
}

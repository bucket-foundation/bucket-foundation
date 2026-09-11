import Link from "next/link";
import type { Metadata } from "next";
import CanonGlobeMount from "@/app/canon/CanonGlobeMount";
import ScrollReveal from "@/components/ScrollReveal";

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

const TOOLS: { name: string; body: string }[] = [
  {
    name: "find",
    body: "Retrieval over the canon, mirrored OpenAlex and Crossref metadata, and open-licensed public sources. Every hit carries a license.",
  },
  {
    name: "quote",
    body: "Exact spans with source id, canonical URL, license, and locator. The tool refuses to paraphrase.",
  },
  {
    name: "check",
    body: "Does a quoted span support, contradict, or fail to settle the learner's claim. The tool abstains when retrieval is weak.",
  },
  {
    name: "organize",
    body: "Claim, evidence, and warrant scaffolds; outlines; citation formatting. Labels only, no generated prose.",
  },
];

export default function ResearchOsPage() {
  return (
    <main className="stone-bone relative grain">
      <div className="max-w-[1100px] mx-auto px-4 md:px-6 pt-14 md:pt-32 pb-6">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          § Research OS · K-12
        </div>
        <h1 className="font-display uppercase text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          find. quote. check.{" "}
          <span className="inlay-gold">organize.</span>
        </h1>
        <p className="mt-7 text-[17px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          A research workspace over the same knowledge graph the Academy
          teaches from, free to any learner, anywhere. Where students of all
          levels access, become aware of, understand, internalize, and
          produce knowledge.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/research-os/workspace"
            className="inline-block px-5 py-3 text-[12px] small-caps tracking-[0.14em] bg-[color:var(--gold)] text-[color:var(--basalt)]"
          >
            Try the prototype →
          </Link>
          <a
            href="https://github.com/bucket-foundation/bucket-foundation/blob/main/learning/research-os/PLAN.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-5 py-3 text-[12px] small-caps tracking-[0.14em] border-2 border-[color:var(--basalt)] text-[color:var(--basalt)] hover:bg-[color:var(--basalt)] hover:text-[color:var(--bone)] transition"
          >
            Read the plan ↗
          </a>
        </div>
      </div>

      {/* Hero visual: the real canon search globe, the same live component
          (with real search) the homepage mounts, sized to match. Its own
          error boundary degrades to the static SVG globe when WebGL is
          unavailable, the same fallback /canon uses. */}
      <ScrollReveal className="relative z-10">
        <div className="w-full px-2 sm:px-4 md:px-6">
          <div className="text-center small-caps text-[11px] tracking-[0.14em] text-[color:var(--aegean-deep)] mb-3">
            § find sources, over the same canon this tool searches
          </div>
          <div id="globe-capture" className="max-w-[1800px] mx-auto">
            <CanonGlobeMount
              branches={[]}
              containerClassName="relative w-full mx-0 md:h-[88vh] md:max-h-[1000px] md:pr-[440px] md:overflow-hidden md:flex md:flex-col rounded-lg border border-[color:var(--hairline)] bg-[color:var(--bone)]/70 backdrop-blur-[1px] shadow-[0_2px_24px_-6px_rgba(31,28,22,0.12)]"
            />
          </div>
        </div>
      </ScrollReveal>

      <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-14 md:py-32">
        <div className="carved-rule max-w-xs mb-12" />
        <div className="mt-12 small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">
          § five states per concept
        </div>
        <p className="mt-4 text-[15px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Each concept in the graph carries one of five states for each learner.
          The states reuse the Academy&apos;s mastery signals and add a reviewed
          production at the top. The design gives a teacher the ability to see,
          question, and override any state, with the override recorded; no
          teacher view has shipped yet (see status, below).
        </p>
        <div className="mt-6 grid grid-cols-1 gap-px bg-[color:var(--hairline)] grid-hairlines">
          {STATES.map((s, i) => (
            <div
              key={s.name}
              className="bg-[color:var(--bone)] p-6 md:p-7 grid grid-cols-1 md:grid-cols-[140px_1fr_1fr] gap-3 md:gap-6"
            >
              <div className="font-display uppercase text-[18px] tracking-[0.04em] text-[color:var(--basalt)]">
                <span className="text-[color:var(--gold-deep)] mr-2">{i + 1}</span>
                {s.name}
              </div>
              <p className="text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">{s.meaning}</p>
              <p className="text-[13px] leading-[1.7] text-[color:var(--basalt-3)]">{s.signal}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">
          § four tools, no pen
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-px bg-[color:var(--hairline)] grid-hairlines">
          {TOOLS.map((t) => (
            <div key={t.name} className="bg-[color:var(--bone)] p-7 md:p-8 flex flex-col gap-3">
              <div className="font-display uppercase text-[20px] tracking-[0.04em] text-[color:var(--basalt)]">
                {t.name}
              </div>
              <div className="w-8 h-0.5 bg-[color:var(--gold)]" />
              <p className="text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">{t.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">
          § frontier first, then backward
        </div>
        <p className="mt-4 text-[15px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          A learner or a teacher picks a frontier: a concept at the edge of a
          branch, or a live hypothesis from Bucket&apos;s hypothesis engine. The
          router walks the prerequisite graph backward to what the learner
          already understands, then forward again to the target. Supports fade
          as the learner&apos;s state rises.
        </p>

        <div className="mt-12 small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">
          § productions that enter the graph
        </div>
        <p className="mt-4 text-[15px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          A production is a claim, the quoted evidence behind it, the checks it
          passed, and its citations. When a teacher and a Bucket reviewer accept
          it, the production becomes a node with a citable id, registered on the
          same rail as every paper on this site, and the hypothesis engine can
          read it as evidence. Citation fees for a contributor under eighteen go
          to a guardian or a custodial account, never to the minor directly, and
          recognition ships before any payout does.
        </p>

        <div className="mt-12 small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">
          § where it sits
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-px bg-[color:var(--hairline)] grid-hairlines">
          <Card href="/academy" title="Academy" body="The consume side: spaced-repetition mastery over the foundations of each branch. Research OS reads the same states." />
          <Card href="/ladder" title="Ladder" body="The L0 to L5 climb from literacy to producing knowledge. Research OS is the production path for the K-12 rung." />
          <Card href="/research" title="Research" body="The tools, datasets, atlas, and papers. Accepted student productions land here as citable nodes." />
        </div>

        <div className="mt-12 small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">
          § status
        </div>
        <p className="mt-4 text-[15px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Design, iteration 2, September 2026. On main today: frontier-backward
          routing with confidence flags on a weak edge, a diagnostic probe for
          a cold-start learner, the four-tool workspace (find, quote, check,
          organize) with every contract enforced in code, a teacher review
          queue and class view with an accept path, an engine bridge covered
          by tests, self-service export and delete of a learner&apos;s own
          data, and a consent gate in front of every learner-authored write.
        </p>
        <p className="mt-4 text-[15px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Not yet on main: applying an accepted production to the live
          database, roster sync from a school system, verified parental
          consent, a payment to a minor contributor, and canon write-back
          without a human sign-off.
        </p>
        <p className="mt-4 text-[15px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Grades 3 to 5 (why the sky is blue) and the history of quantum
          physics for grades 9 to 12 remain the two candidate subjects for the
          next demonstration; which one leads is still an open choice
          (<code className="text-[13px]">_intake/research-os-k12/RESEARCH-OS-K12-SYSTEM-REVIEW.md</code>{" "}
          section 11). The plan, the learner-state model, the production
          schema, the vendor and data-source map, and the funding and people
          map are public in the repository under{" "}
          <code className="text-[13px]">learning/research-os/</code> and{" "}
          <code className="text-[13px]">_intake/research-os-k12/</code>.
          Pilot classrooms, a pre-registered study of the four-tool constraint,
          and a state-validation paper come before any wider release.
        </p>
      </div>
    </main>
  );
}

function Card({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="block h-full">
      <div className="bg-[color:var(--bone)] p-7 md:p-8 flex flex-col gap-3 min-h-[150px] h-full shadow-[inset_0_1px_0_rgba(239,232,212,0.6),inset_0_-1px_0_rgba(31,28,22,0.18)]">
        <div className="font-display uppercase text-[20px] tracking-[0.04em] text-[color:var(--basalt)]">
          {title}
        </div>
        <div className="w-8 h-0.5 bg-[color:var(--gold)]" />
        <p className="text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">{body}</p>
        <div className="mt-auto pt-3 text-[11px] small-caps tracking-[0.14em]">
          <span className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4">
            open {title.toLowerCase()} →
          </span>
        </div>
      </div>
    </Link>
  );
}

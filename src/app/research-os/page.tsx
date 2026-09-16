import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import FixedCanonGlobeBackground from "@/components/FixedCanonGlobeBackground";
import RevealRow from "./RevealRow";
import "./landing.css";

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

// Five levels of interaction with the graph, each holding the ones before
// it. Founder's framing, 2026-09-15: learning/research-os/INTEGRATION-PLAN.md.
const STATES: { name: string; line: string }[] = [
  {
    name: "Access",
    line: "Who can see and use a piece of knowledge. Public, private, or shared with named people, the way a repository or a drive works.",
  },
  {
    name: "Awareness",
    line: "Knowing where knowledge can go. From any node, the directions beyond it and the frontier around it.",
  },
  { name: "Understanding", line: "Learning the thing itself. Lessons, recall, and checks until the concept holds." },
  {
    name: "Internalization",
    line: "The learned concept meets the rest of the graph. Connections, transfer, use beyond where it was taught.",
  },
  {
    name: "Production",
    line: "A new node on the graph, built from the nodes you hold, placed among them, and cited by others.",
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

const TRUST = "Free · no login for the demo · every quote traces to a real source";

export default function ResearchOsPage() {
  return (
    <>
      <FixedCanonGlobeBackground />
      <main className="stone-bone relative z-10 grain">
        <section className="ros-hero">
          <div className="ros-wrap">
            <h1 className="font-display uppercase chisel text-[color:var(--basalt)]">
              Research OS for <span className="inlay-gold">K-12</span>
            </h1>
            <p className="ros-sub">
              Where students of all levels access, become aware of, understand,
              internalize, and produce knowledge.
            </p>
            <div className="ros-cta-row">
              <a className="ros-btn" href="#states">
                See the Five States →
              </a>
              <span className="ros-trust">{TRUST}</span>
            </div>
          </div>
        </section>

        <section id="states" className="ros-section">
          <div className="ros-wrap">
            <h2 className="ros-section-title font-display text-[color:var(--basalt)]">Five States</h2>
            <p className="ros-section-sub">Five levels of interaction with the graph. Each holds the ones before it.</p>
            {STATES.map((s, i) => {
              const shot = STATE_SCREENSHOTS[i];
              return (
                <RevealRow key={s.name} reverse={i % 2 === 1}>
                  <div className="ros-image">
                    <Image
                      src={shot.src}
                      alt={shot.alt}
                      width={960}
                      height={600}
                      sizes="(min-width: 768px) 55vw, 100vw"
                      priority={i === 0}
                    />
                  </div>
                  <div className="ros-text">
                    <div className="ros-num">
                      {String(i + 1).padStart(2, "0")} / {String(STATES.length).padStart(2, "0")}
                    </div>
                    <h3 className="font-display text-[color:var(--basalt)]">{s.name}</h3>
                    <p>{s.line}</p>
                    <Link href={shot.route}>view {shot.label} →</Link>
                  </div>
                </RevealRow>
              );
            })}
          </div>
        </section>

        <div className="ros-wrap">
          <hr className="ros-divider" />
        </div>

        <section id="cta" className="ros-section ros-final">
          <div className="ros-wrap">
            <h2 className="ros-section-title font-display text-[color:var(--basalt)]" style={{ marginBottom: 0 }}>
              Start with one concept.
            </h2>
            <div className="ros-cta-row">
              <Link className="ros-btn" href="/research-os/workspace">
                Open the Workspace →
              </Link>
              <span className="ros-trust">{TRUST}</span>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

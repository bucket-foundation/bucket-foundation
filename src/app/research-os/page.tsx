import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import FixedCanonGlobeBackground from "@/components/FixedCanonGlobeBackground";
import RevealRow from "./RevealRow";
import "./landing.css";
import { RESEARCH_ORIGIN } from "@/lib/research-host";

export const metadata: Metadata = {
  title: "Research OS for K-12 · find, quote, check, organize",
  description:
    "A student research workspace over Bucket's knowledge graph. The AI finds sources, quotes them with provenance, checks claims against quotes, and organizes evidence. It never writes the answer. Five learner states per concept, a teacher class view, and student productions that become citable nodes.",
  alternates: { canonical: RESEARCH_ORIGIN },
  openGraph: {
    type: "website",
    url: RESEARCH_ORIGIN,
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

const STATE_SCREENSHOTS: { src: string; alt: string; route: string; label: string }[] = [
  { src: "/research-os/app-access.png", alt: "The Data view of the Bucket desktop app: what is loaded on this computer.", route: "/download", label: "Data in the app" },
  { src: "/research-os/app-awareness.png", alt: "The Knowledge graph view of the Bucket desktop app: every idea in your decks, linked to what it builds on.", route: "/download", label: "the Graph in the app" },
  { src: "/research-os/app-understanding.png", alt: "The Learn view of the Bucket desktop app: decks and mastery per branch.", route: "/download", label: "Learn in the app" },
  { src: "/research-os/app-internalization.png", alt: "The Progress view of the Bucket desktop app: how far each idea has gone, across branches.", route: "/download", label: "Progress in the app" },
  { src: "/research-os/app-production.png", alt: "The Canon view of the Bucket desktop app: source excerpts on the globe.", route: "/download", label: "the Canon in the app" },
];

const FIRST_TASK: string[] = [
  "Pick one concept, for example ATP synthase.",
  "Ask the AI for sources. It returns quotes with the page they came from.",
  "Write one sentence of your own about the concept.",
  "Run the check. It compares your sentence with the quotes and shows which claims a quote supports.",
];

const TRUST = "Free · no login for the demo · every quote traces to a real source";

export default function ResearchOsPage() {
  return (
    <>
      <noscript>
        <style>{".ros-row .ros-image,.ros-row .ros-text{opacity:1;transform:none;transition:none}"}</style>
      </noscript>
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
              <Link className="ros-btn" href="/research-os/home">
                Open Research OS →
              </Link>
              <span className="ros-trust">{TRUST}</span>
            </div>
          </div>
        </section>

        <section id="first-task" className="ros-section">
          <div className="ros-wrap ros-panel">
            <h2 className="ros-section-title font-display text-[color:var(--basalt)]">Your first task</h2>
            <p className="ros-section-sub">One concept, four steps. Research OS is in private testing.</p>
            <ol className="list-decimal pl-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)]">
              {FIRST_TASK.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className="ros-cta-row">
              <Link className="ros-btn" href="/research-os/workspace">
                Try it in the Workspace →
              </Link>
            </div>
          </div>
        </section>

        <section id="states" className="ros-section">
          <div className="ros-wrap ros-panel">
            <h2 className="ros-section-title font-display text-[color:var(--basalt)]">Five States</h2>
            <p className="ros-section-sub">The same concept at five depths, from being allowed to open it to adding a new node beside it. Each depth holds the ones before it.</p>
            {STATES.map((s, i) => {
              const shot = STATE_SCREENSHOTS[i];
              return (
                <RevealRow key={s.name} reverse={i % 2 === 1}>
                  <div className="ros-image">
                    <Image
                      src={shot.src}
                      alt={shot.alt}
                      width={1440}
                      height={900}
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
          <div className="ros-wrap ros-panel">
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

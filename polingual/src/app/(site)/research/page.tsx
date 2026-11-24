import Signup from "@/app/signup";
import { pageMeta } from "@/lib/meta";
import Site from "@/app/site";
import { P } from "./parts";
import { RecordSection, MathSection, NetworkSection, ScaleSection, SourcesSection, QuestionsSection, JoinSection } from "./sections";

const NAV = [
    { id: "record", label: "The record" },
  { id: "math", label: "The math" },
  { id: "network", label: "The network" },
  { id: "ranking", label: "Search at scale" },
  { id: "sources", label: "Sources" },
  { id: "questions", label: "Open questions" },
  { id: "join", label: "Join" },
];

export const metadata = pageMeta({ path: "/research", title: "Polingual research notes", documentTitle: "Research notes · Polingual", type: "article", description: "Polingual research notes: a cross-lingual dictionary of 6.5 million words built on one meaning graph." });

function SideNav() {
  return (
    <aside className="hidden md:block">
      <nav className="sticky top-8 pt-16">
        <ul className="space-y-2 font-sans text-sm">
          {NAV.map((n) => (
            <li key={n.id}>
              <a href={`#${n.id}`} className="hover:underline text-[color:var(--ink-dim)]">{n.label}</a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

function MobileNav() {
  return (
    <details className="md:hidden sticky top-0 z-10 -mx-4 mt-8 px-4 py-3 font-sans text-[15px] backdrop-blur bg-[color-mix(in_srgb,var(--pl-paper)_88%,transparent)] border-b border-[color:var(--pl-hairline)]">
      <summary className="cursor-pointer font-semibold text-[color:var(--ink)]">Contents</summary>
      <ul className="mt-2 space-y-2">
        {NAV.map((n) => (
          <li key={n.id}><a href={`#${n.id}`} className="text-[color:var(--ink-2)]">{n.label}</a></li>
        ))}
      </ul>
    </details>
  );
}

export default function ResearchPage() {
  return (
    <Site bare>
    <div className="relative">
      <div className="hero-glow absolute inset-x-0 top-0 h-[480px] pointer-events-none" />
      <div className="relative mx-auto max-w-6xl px-4 md:px-8 md:grid md:grid-cols-[180px_1fr] md:gap-12">
        <SideNav />

        <div className="min-w-0 max-w-3xl pb-24">
          <header className="pt-10 md:pt-16">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[color:var(--ink-dim)]">polingual v0, research notes</p>
            <h1 className="mt-4 leading-[1.05] text-[clamp(2.2rem,5vw,3.8rem)] text-[color:var(--pl-ink)] tracking-[-0.02em]">
              Every word in every language, <em className="text-[color:var(--blue)]">one meaning.</em>
            </h1>
            <p className="mt-6 text-center text-[15px] font-bold text-[color:var(--ink)]">Abstract</p>
            <P>
              polingual is a cross-lingual dictionary and an open research project. It holds 6.5 million words in 35
              languages. Each word is a record with an English meaning, two vectors, and links to the same idea in
              other languages.
            </P>
            <p className="mt-6 font-sans text-[15px]"><a href="/" className="underline text-[color:var(--blue)]">Back to search</a></p>
            <div className="mt-6 max-w-lg">
              <p className="font-sans text-[15px] font-semibold text-[color:var(--ink)]">Speak two languages or more? Get early access to the learner tools.</p>
              <div className="mt-2"><Signup compact /></div>
            </div>
          </header>

          <MobileNav />

          <RecordSection />
          <MathSection />
          <NetworkSection />
          <ScaleSection />
          <SourcesSection />
          <QuestionsSection />
          <JoinSection />

          <footer className="mt-24 space-y-2 font-sans text-[13px] text-[color:var(--ink-dim)]">
            <p>
              Dictionary data from <a href="https://en.wiktionary.org" className="underline">Wiktionary</a> via{" "}
              <a href="https://kaikki.org" className="underline">Kaikki</a>, licensed{" "}
              <a href="https://creativecommons.org/licenses/by-sa/4.0/" className="underline">CC BY-SA 4.0</a>.
            </p>
            <p>
              Same graph as <a href="https://www.bucket.foundation" className="underline text-[color:var(--blue)]">bucket.foundation</a>.
            </p>
          </footer>
        </div>
      </div>
    </div>
    </Site>
  );
}
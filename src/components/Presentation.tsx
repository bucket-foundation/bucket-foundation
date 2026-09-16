import Link from "next/link";
import CanonSearchPanel from "./CanonSearchPanel";
import { getBranches } from "@/lib/canon-fs";
import type { GlobeBranch } from "./CanonGlobe";

const BRANCHES = [
  { num: "I",    slug: "mathematics", name: "mathematics", note: "axioms · real math" },
  { num: "II",   slug: "physics",     name: "physics",     note: "laws · first principles" },
  { num: "III",  slug: "chemistry",   name: "chemistry",   note: "periodic · quantum · thermo" },
  { num: "IV",   slug: "information", name: "information", note: "computation · information" },
  { num: "V",    slug: "biophysics",  name: "biophysics",  note: "light · water · mitochondria" },
  { num: "VI",   slug: "cosmology",   name: "cosmology",   note: "spacetime · structure" },
  { num: "VII",  slug: "mind",        name: "mind",        note: "cognition · consciousness" },
  { num: "VIII", slug: "earth",       name: "earth",       note: "geosciences · biosphere" },
];

const RESEARCH_OS_STAGES = [
  "Access",
  "Awareness",
  "Understanding",
  "Internalization",
  "Production",
];

const MARQUEE = [
  "reform education",
  "widen producing",
  "reform education",
  "widen producing",
  "reform education",
  "widen producing",
  "reform education",
  "widen producing",
];

export default function Presentation() {
  const branches = getBranches();
  const globeBranches: GlobeBranch[] = branches.map((b) => ({
    slug: b.slug,
    numeral: b.numeral,
    name: b.name,
    status: b.status,
    entryCount: b.entryCount,
  }));

  return (
    <main className="min-h-screen stone-bone">
      {/* ════════════════════════════════════════════════════════════ */}
      {/* HERO · the inscription                                        */}
      {/* ════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden grain min-h-[78vh] flex flex-col justify-center">
        {/* Ambient patina */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(48% 52% at 78% 30%, rgba(14,140,140,0.12) 0%, rgba(247,244,236,0) 60%), radial-gradient(38% 42% at 12% 80%, rgba(232,178,58,0.10) 0%, rgba(247,244,236,0) 60%)",
          }}
        />

        {/* z-20 on the content alone: the section's patina stays below the
            home globe that rises into the hero, so the halo shows no seam. */}
        <div className="relative z-20 max-w-2xl mx-auto px-4 md:px-6 py-16 md:py-24 text-center">
          <div className="carve-in font-mono-mark uppercase text-[10px] tracking-[0.4em] text-[color:var(--basalt-2)] mb-10 flex items-center justify-center gap-2">
            <span className="text-[color:var(--crimson)]">◆</span>
            bucket foundation · nonprofit
          </div>

          <h1 className="carve-in-2 font-display uppercase text-[clamp(1.9rem,8vw,3.25rem)] leading-[1.1] chisel tracking-[0.01em]">
            reform <span className="inlay-gold">education.</span>
          </h1>

          <div className="mt-6 carve-in-3 carved-rule max-w-xs mx-auto" />

          <p className="mt-8 carve-in-4 mx-auto max-w-lg text-[17px] md:text-[19px] text-[color:var(--basalt)] font-semibold leading-[1.6]">
            Bucket is the operating system a student runs inside from the first
            year of school to the research frontier.
          </p>

          <div className="mt-10 carve-in-5 flex justify-center">
            <Link
              href="/research-os"
              className="group relative px-8 py-4 bg-[color:var(--basalt)] text-[color:var(--bone)] hover:bg-[color:var(--aegean-deep)] transition small-caps text-[11px] shadow-[inset_0_-2px_0_rgba(0,0,0,0.4),inset_0_1px_0_rgba(247,244,236,0.12)]"
            >
              <span className="flex items-center gap-3">
                Research OS
                <span className="text-[color:var(--gold)] group-hover:translate-x-1 transition">
                  →
                </span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* CANON SEARCH PANEL · full viewport, globe rises above the hero */}
      {/* above it; the real search bar and branch filter chips ship     */}
      {/* inside CanonGlobeMount itself, no separate outer nav here.     */}
      {/* ════════════════════════════════════════════════════════════ */}
      <CanonSearchPanel branches={globeBranches} />

    </main>
  );
}

/* ───────────── helpers ───────────── */


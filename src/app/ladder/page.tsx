import Link from "next/link";
import Script from "next/script";
import type { Metadata } from "next";
import DepthLadder from "@/components/DepthLadder";
import {
  DEPTH_LADDER,
  domainOnRamp,
  rungForMastery,
  type DepthLevel,
} from "@/lib/depth-ladder";
import { getBranch } from "@/lib/canon";

// /ladder, the continuous L0→L5 depth ladder made visible and navigable
// (bkt-a7v). The produce-side on-ramp: mastery → canon → tools → research
// agent, with no gap. Cross-linked from /mission and the Academy flow. The
// research agent (terminal rung) is LINKED from here.

export const metadata: Metadata = {
  title: "The depth ladder · mastery → frontier → producing knowledge",
  description:
    "One continuous climb from learning a field to producing new knowledge in it. The L0→L5 depth ladder maps Bucket's shipped pieces onto the rungs — Academy mastery (L1–L2), the canon (L3–L4), the 40 research tools + the research agent (L4–L5) — so a learner can cross the consume-vs-produce gap with no gap between the rungs.",
  alternates: { canonical: "/ladder" },
  openGraph: {
    type: "website",
    url: "https://www.bucket.foundation/ladder",
    title: "The depth ladder · bucket.foundation",
    description:
      "Academy mastery → canon → research tools → research agent. One continuous L0→L5 climb, Bucket's answer to the empty scalable-and-production-reaching cell.",
  },
  twitter: {
    card: "summary_large_image",
    title: "The depth ladder · bucket.foundation",
    description:
      "From mastering a field to producing knowledge in it — one continuous L0→L5 climb.",
  },
};

const LADDER_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  "@id": "https://www.bucket.foundation/ladder",
  name: "The Bucket depth ladder (L0→L5)",
  description:
    "A continuous knowledge-depth ladder from mastery to producing new knowledge, mapping Academy mastery, the canon, the research tools, and the research agent onto a single climb.",
  url: "https://www.bucket.foundation/ladder",
  learningResourceType: ["Reference", "Tutorial"],
  isAccessibleForFree: true,
};

function isLevel(v: string | undefined): v is DepthLevel {
  return !!v && ["L0", "L1", "L2", "L3", "L4", "L5"].includes(v);
}

export default function Page({
  searchParams,
}: {
  searchParams?: { branch?: string; level?: string; mastery?: string };
}) {
  // Optional position seed. A learner arriving from the Academy can pass
  //?branch=<slug> and either?level=Lx or?mastery=0..1; we keep it
  // (mastery alone never places above L2) and degrade gracefully when absent.
  const branchSlug = (searchParams?.branch || "").trim().toLowerCase();
  const branch = branchSlug ? getBranch(branchSlug) : undefined;

  let currentLevel: DepthLevel | undefined;
  if (isLevel(searchParams?.level)) {
    currentLevel = searchParams!.level as DepthLevel;
  } else if (searchParams?.mastery) {
    const m = Number(searchParams.mastery);
    if (Number.isFinite(m)) currentLevel = rungForMastery(m);
  }

  const ramp = branch ? domainOnRamp(branch.slug) : null;

  return (
    <main className="stone-bone relative grain">
      <Script
        id="ld-ladder"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(LADDER_JSON_LD) }}
      />
      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-14 md:py-28">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          § The depth ladder
        </div>
        <h1 className="font-display uppercase text-[clamp(2rem,5vw,3.6rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          learn a field, then{" "}
          <span className="inlay-gold">produce knowledge in it.</span>
        </h1>
        <p className="mt-7 text-[17px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          The same six-rung depth scale that produced the access cliff on the{" "}
          <Link
            href="/mission"
            className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4 hover:text-[color:var(--basalt)]"
          >
            mission
          </Link>{" "}
          is the path out of it. Bucket&rsquo;s pieces are not five products —
          they are <strong className="text-[color:var(--basalt)]">rungs on one
          ladder</strong>, so a motivated learner can climb from mastering a
          field to producing knowledge in it without a gap.
        </p>

        {branch && (
          <div className="mt-10 bg-[color:var(--bone)] p-6 md:p-7 border-l-2 border-[color:var(--gold)] shadow-[inset_0_1px_0_rgba(239,232,212,0.6),inset_0_-1px_0_rgba(31,28,22,0.18)]">
            <div className="small-caps text-[10px] tracking-[0.16em] text-[color:var(--aegean-deep)]">
              your on-ramp in {branch.name}
            </div>
            <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
              You&rsquo;ve been learning{" "}
              <strong className="text-[color:var(--basalt)]">{branch.name}</strong>{" "}
              in the Academy. Here is the path up from mastery to the frontier and
              beyond — read the canon on this branch, then take the produce-side
              tools and the research agent to it.
            </p>
            {ramp && (
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-[11px] small-caps tracking-[0.14em]">
                <Link
                  href={ramp.canon.href}
                  className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
                >
                  {ramp.canon.label} →
                </Link>
                <Link
                  href={ramp.tools.href}
                  className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
                >
                  {ramp.tools.label} →
                </Link>
                <Link
                  href={ramp.agent.href}
                  className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
                >
                  {ramp.agent.label} →
                </Link>
              </div>
            )}
          </div>
        )}

        <div className="carved-rule max-w-xs mt-12" />

        <div className="mt-12">
          <DepthLadder
            currentLevel={currentLevel}
            showThesis
            missionLink
            heading="L0 → L5 · the rungs, and the Bucket piece that serves each"
          />
        </div>

        {/* the produce-side on-ramp, spelled out */}
        <div className="carved-rule max-w-xs mt-16" />
        <div className="mt-12 small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">
          § The produce-side on-ramp · three moves
        </div>
        <div className="mt-6 flex flex-col gap-px bg-[color:var(--hairline)] grid-hairlines">
          {DEPTH_LADDER.filter((r) => r.surfaces.length > 0)
            .slice(-3)
            .map((r) => (
              <div
                key={r.level}
                className="bg-[color:var(--bone)] p-6 md:p-7 shadow-[inset_0_1px_0_rgba(239,232,212,0.6),inset_0_-1px_0_rgba(31,28,22,0.18)]"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-[18px] text-[color:var(--basalt-3)]">
                    {r.level}
                  </span>
                  <span className="font-display uppercase text-[15px] tracking-[0.03em] text-[color:var(--basalt)]">
                    {r.surfaces[0].label}
                  </span>
                </div>
                <p className="mt-2 text-[13px] leading-[1.6] text-[color:var(--basalt-2)]">
                  {r.surfaces[0].note}
                </p>
              </div>
            ))}
        </div>

        <p className="mt-10 text-[12px] leading-[1.7] text-[color:var(--basalt-3)]">
          The L0→L5 rung labels are the depth scale from the{" "}
          <a
            href="https://github.com/bucket-foundation/education-atlas"
            target="_blank"
            rel="noreferrer"
            className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            education-atlas
          </a>{" "}
          (analysis/landscape/scale.py); the world-access figures are the
          published Knowledge-Access Gradient (L0 82.5% → L4 0.14%, a ~270× fall).
          The research agent at the top is already built — this ladder links into
          it. The Academy gives an honest signal, not a certified rating.
        </p>
      </div>
    </main>
  );
}

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mission · reform the knowledge layer",
  description:
    "Bucket Foundation exists to reform education — honestly. The founding research (the education-atlas Knowledge-Access Gradient) maps three crises, a 270× access cliff, and a consume-vs-produce gap where 99.86% of humanity only ever consumes knowledge. Bucket reforms the knowledge layer, not schooling logistics — and says so plainly.",
  alternates: { canonical: "/mission" },
  openGraph: {
    type: "article",
    url: "https://www.bucket.foundation/mission",
    title: "Mission · reform the knowledge layer — bucket.foundation",
    description:
      "The founding research, and an honest map of what Bucket can and cannot reform. Free primary knowledge, research tools, author-routed economics, an un-capped frontier — bounded to the knowledge layer.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mission · reform the knowledge layer — bucket.foundation",
    description:
      "The education-atlas founding research, and an honest map of Bucket's levers against it.",
  },
};

const ATLAS_REPO = "https://github.com/bucket-foundation/education-atlas";
const FLAGSHIP =
  "https://github.com/bucket-foundation/education-atlas/blob/main/docs/THE-KNOWLEDGE-ACCESS-GRADIENT.md";
const REFORM_THESIS =
  "https://github.com/bucket-foundation/education-atlas/blob/main/docs/REFORM_THESIS.md";
const PROBLEMS =
  "https://github.com/bucket-foundation/education-atlas/blob/main/docs/EDUCATION_PROBLEMS.md";

export default function Page() {
  return (
    <main className="stone-bone relative grain">
      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-14 md:py-32">
        {/* ───────────────────────── header ───────────────────────── */}
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          § Mission · reform the knowledge layer
        </div>
        <h1 className="font-display uppercase text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          for five thousand years the world widened reading{" "}
          <span className="inlay-gold">and never widened producing.</span>
        </h1>
        <p className="mt-7 text-[17px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Bucket Foundation exists to reform education. Reform that is not
          grounded in evidence is opinion — so we built the evidence first. The{" "}
          <a
            href={ATLAS_REPO}
            target="_blank"
            rel="noreferrer"
            className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4 hover:text-[color:var(--basalt)]"
          >
            education-atlas
          </a>{" "}
          holds 78,326 observations across 219 countries; its flagship synthesis,{" "}
          <a
            href={FLAGSHIP}
            target="_blank"
            rel="noreferrer"
            className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4 hover:text-[color:var(--basalt)]"
          >
            the Knowledge-Access Gradient
          </a>
          , is the founding research below. Every number on this page traces to
          it.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        {/* ═══════════════════════ THE PROBLEM ═══════════════════════ */}
        <div className="mt-16 small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">
          § The problem · what the research found
        </div>
        <h2 className="mt-4 font-display uppercase text-[clamp(1.5rem,3.5vw,2.25rem)] leading-[1.1] chisel text-[color:var(--basalt)]">
          a broad shallow base and a thin, gated, unequal peak.
        </h2>

        {/* Three crises */}
        <p className="mt-8 small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">
          three crises, stacked
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-px bg-[color:var(--hairline)] grid-hairlines">
          <Stat
            figure="48.3%"
            label="learning"
            body="of 10-year-olds worldwide cannot read a simple text — 86.5% in Sub-Saharan Africa. These are children in school. The learning crisis is the deepest."
          />
          <Stat
            figure="112M"
            label="access"
            body="51.2M primary-age + 61.2M lower-secondary-age children out of school. The access crisis shrank but moved up a level."
          />
          <Stat
            figure="3.6%"
            label="financing"
            body="of GDP is the world's education spend — below the agreed 4% floor, with 92 of ~200 countries beneath it. The most actionable lever."
          />
        </div>

        {/* The access cliff */}
        <p className="mt-12 small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">
          the access cliff · depth, not age, is the binding constraint
        </p>
        <p className="mt-4 text-[15px] leading-[1.75] text-[color:var(--basalt-2)]">
          Lay the world on a six-rung ladder of knowledge depth and access falls
          off a cliff. World-average access by depth — a{" "}
          <strong className="text-[color:var(--basalt)]">~270× fall</strong>{" "}
          from undergraduate to the frontier, the rich-poor gap widening from
          under 2× at literacy to ~75× at the frontier:
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr className="text-left">
                <th className="border-b border-[color:var(--hairline)] py-2.5 pr-4 small-caps text-[10px] tracking-[0.14em] text-[color:var(--aegean-deep)] font-normal">
                  depth
                </th>
                <th className="border-b border-[color:var(--hairline)] py-2.5 pr-4 small-caps text-[10px] tracking-[0.14em] text-[color:var(--aegean-deep)] font-normal text-right">
                  world access
                </th>
              </tr>
            </thead>
            <tbody className="text-[color:var(--basalt-2)]">
              <CliffRow d="L0 — basic literacy" v="82.5%" />
              <CliffRow d="L1 — K-12 / secondary" v="62.4%" />
              <CliffRow d="L2 — undergraduate" v="37.4%" />
              <CliffRow d="L3 — graduate / professional" v="8.1%" />
              <CliffRow d="L4 — read the research frontier" v="0.14%" />
              <CliffRow d="L5 — produce new knowledge" v="0.06%" last />
            </tbody>
          </table>
        </div>

        {/* Consume vs produce */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-px bg-[color:var(--hairline)] grid-hairlines">
          <Stat
            figure="99.86%"
            label="only consume"
            body="of humanity only ever consumes knowledge; ~0.14% ever reaches the place where it is produced. The single most dramatic number in the corpus."
          />
          <Stat
            figure="5,000 yrs"
            label="the arc"
            body="Every prior knowledge technology — writing, the printing press, mass schooling, the internet, open access — widened access to CONSUME knowledge. NONE widened access to PRODUCE it."
          />
        </div>

        <p className="mt-10 text-[15px] leading-[1.75] text-[color:var(--basalt-2)]">
          The mechanism is one empty cell. Order the channels people learn
          through by reach: the ones that scale (informal/open courses,
          self-directed study) all ceiling out below the frontier; the one that
          reliably reaches production — apprenticeship, the lab — cannot scale,
          because the supply of mentors is bounded by the existing producer
          population. A channel that is{" "}
          <strong className="text-[color:var(--basalt)]">
            both scalable and production-reaching has been empty for all of
            recorded history.
          </strong>{" "}
          That empty cell <em>is</em> the consume-versus-produce gap. AI is the
          first technology in the entire arc — and the first modality — for which
          that verdict is not yet written. The number to watch is whether the
          produce-access rate ever moves.
        </p>

        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-[11px] small-caps tracking-[0.14em]">
          <a
            href={FLAGSHIP}
            target="_blank"
            rel="noreferrer"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            the knowledge-access gradient ↗
          </a>
          <a
            href={PROBLEMS}
            target="_blank"
            rel="noreferrer"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            the three crises ↗
          </a>
          <a
            href={ATLAS_REPO}
            target="_blank"
            rel="noreferrer"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            education-atlas repo ↗
          </a>
        </div>

        {/* ═══════════════════ HOW BUCKET ADDRESSES IT ═══════════════════ */}
        <div className="carved-rule max-w-xs mt-20" />
        <div className="mt-16 small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">
          § How Bucket addresses it · the knowledge layer
        </div>
        <h2 className="mt-4 font-display uppercase text-[clamp(1.5rem,3.5vw,2.25rem)] leading-[1.1] chisel text-[color:var(--basalt)]">
          reform the layer underneath the schooling.
        </h2>
        <p className="mt-7 text-[16px] leading-[1.75] text-[color:var(--basalt-2)]">
          The highest-leverage region the research names is the{" "}
          <strong className="text-[color:var(--basalt)]">
            L3→L4→L5 zone
          </strong>{" "}
          — the comprehension bridge from established knowledge to the frontier,
          an author-routed production economics, and non-institutional, any-age
          frontier access. That is the prize the modality data calls{" "}
          <em>the first channel that scales all the way to production.</em>{" "}
          Bucket&rsquo;s levers map onto exactly that region:
        </p>

        <div className="mt-8 flex flex-col gap-px bg-[color:var(--hairline)] grid-hairlines">
          <Lever
            n="01"
            title="the canon · free primary knowledge"
            href="/canon"
            cta="read the canon"
            body="Free-to-read foundations — axioms, real math, laws, primary derivations — across seven branches. Attacks the paywall/credential gate that keeps <1% of people ever reading primary research, and the un-capped ceiling for those who could go furthest."
          />
          <Lever
            n="02"
            title="40 research tools · let anyone DO research"
            href="/research"
            cta="open the research hub"
            body="An AI amplifier for self-directed learning at the frontier — instruments that let a motivated person produce research, not only consume it. The bridge from 'finished the courses' to 'can read and contribute to primary research' that no current product aims at."
          />
          <Lever
            n="03"
            title="cite-forever / feed402 · author-routed economics"
            href="/cite-forever/v0.1"
            cta="the cite-forever license"
            body="Paid-to-cite, routed to the author — not the publisher. Attacks the one gate the open-access movement left fully standing: academic publishers earning ~38% margins on donated labor, selling publicly funded work back to the public."
          />
          <Lever
            n="04"
            title="the academy · learning-to-learn"
            href="/academy"
            cta="open the academy"
            body="Spaced-repetition mastery over the canon's seven branches. Targets the highest-leverage missing skill the research names — metacognition and self-regulation — where 84% of students reread and 72% wrongly believe massing beats spacing."
          />
          <Lever
            n="05"
            title="open frontier access · the un-capped ceiling"
            href="/contribute"
            cta="contribute"
            body="Non-institutional, any-age access to the full boundaries of knowledge, plus an open path to extend them — for the small number of people who can take a model and an axiom and reach a layer of reality nobody has reached before."
          />
        </div>

        {/* ═══════════════════ THE HONEST BOUNDARY ═══════════════════ */}
        <div className="mt-16 small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">
          § The honest boundary · what Bucket does NOT solve
        </div>
        <div className="mt-6 bg-[color:var(--bone)] p-7 md:p-9 shadow-[inset_0_1px_0_rgba(239,232,212,0.6),inset_0_-1px_0_rgba(31,28,22,0.18)] border-l-2 border-[color:var(--gold)]">
          <p className="text-[16px] leading-[1.8] text-[color:var(--basalt-2)]">
            Bucket reforms the{" "}
            <strong className="text-[color:var(--basalt)]">
              knowledge layer
            </strong>{" "}
            — how knowledge is accessed, produced, validated, and paid for. It is
            a foundation, not a ministry of education. It does{" "}
            <strong className="text-[color:var(--basalt)]">not</strong> fix the{" "}
            <strong className="text-[color:var(--basalt)]">
              schooling-logistics layer
            </strong>
            : K-12 funding inequity, the teacher pay penalty, the student-debt
            overhang, completion gaps, the access and financing crisis in
            low-income states, or the floor-level learning-poverty emergency.
            Those are state-capacity problems, and the proven levers there —
            Teaching at the Right Level, conditional cash transfers, the
            financing floor — are owned by states and NGOs.
          </p>
          <p className="mt-5 text-[16px] leading-[1.8] text-[color:var(--basalt-2)]">
            Open knowledge is{" "}
            <strong className="text-[color:var(--basalt)]">
              necessary but not sufficient
            </strong>
            : a reachable frontier is useless to a learner never taught to direct
            their own learning, and irrelevant to a child who is not in school at
            all. And reforming the knowledge layer is itself a{" "}
            <strong className="text-[color:var(--basalt)]">value choice</strong>,
            not a verdict the data dictates — the research is explicit that there
            is no single cross-civilizational answer to what education is{" "}
            <em>for</em>. Bucket&rsquo;s open-knowledge thesis is named in the
            atlas as <em>one defensible option among contested aims</em>, and we
            state it as one.
          </p>
          <p className="mt-5 text-[16px] leading-[1.8] text-[color:var(--basalt-2)]">
            We are also honest about what is{" "}
            <strong className="text-[color:var(--basalt)]">built</strong> versus
            what is <strong className="text-[color:var(--basalt)]">scaffolded</strong>.
            The canon, the research tools, the academy, and the author-routed
            economics exist today. The autonomous research{" "}
            <strong className="text-[color:var(--basalt)]">agent</strong> — the
            piece that would carry a self-directed learner across the production
            gate — and the turning flywheel that connects them are still being
            built. Bucket is a wager on the scalable-production channel that has
            never existed. AI is the first serious candidate to fill it; whether
            it does is the open question this whole mission is organized around,
            not a result we claim.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-[11px] small-caps tracking-[0.14em]">
            <a
              href={REFORM_THESIS}
              target="_blank"
              rel="noreferrer"
              className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
            >
              the reform thesis ↗
            </a>
            <Link
              href="/research"
              className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
            >
              /research
            </Link>
            <Link
              href="/canon"
              className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
            >
              /canon
            </Link>
            <Link
              href="/academy"
              className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
            >
              /academy
            </Link>
            <Link
              href="/contribute"
              className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
            >
              /contribute
            </Link>
          </div>
        </div>

        {/* sources */}
        <p className="mt-12 text-[12px] leading-[1.7] text-[color:var(--basalt-3)]">
          Every figure on this page is drawn from the{" "}
          <a
            href={ATLAS_REPO}
            target="_blank"
            rel="noreferrer"
            className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            education-atlas
          </a>{" "}
          — the three crises (48.3% learning poverty, 51.2M + 61.2M out of
          school, 3.6% of GDP), the access cliff (L0 82.5% → L4 0.14%, ~270×),
          and the consume-vs-produce gap (99.86% / 0.14%) from{" "}
          <a
            href={FLAGSHIP}
            target="_blank"
            rel="noreferrer"
            className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            THE-KNOWLEDGE-ACCESS-GRADIENT.md
          </a>{" "}
          and{" "}
          <a
            href={PROBLEMS}
            target="_blank"
            rel="noreferrer"
            className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            EDUCATION_PROBLEMS.md
          </a>
          ; the levers and the honest boundary from{" "}
          <a
            href={REFORM_THESIS}
            target="_blank"
            rel="noreferrer"
            className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            REFORM_THESIS.md
          </a>
          . Atlas sources: World Bank EdStats, UNESCO UIS, OECD PISA 2022,
          Our World in Data, OpenAlex.
        </p>
      </div>
    </main>
  );
}

function Stat({
  figure,
  label,
  body,
}: {
  figure: string;
  label: string;
  body: string;
}) {
  return (
    <div className="bg-[color:var(--bone)] p-7 md:p-8 flex flex-col gap-3 min-h-[190px] shadow-[inset_0_1px_0_rgba(239,232,212,0.6),inset_0_-1px_0_rgba(31,28,22,0.18)]">
      <div className="font-display text-[34px] leading-none text-[color:var(--basalt)] chisel">
        {figure}
      </div>
      <div className="small-caps text-[10px] tracking-[0.14em] text-[color:var(--aegean-deep)]">
        {label}
      </div>
      <div className="w-8 h-0.5 bg-[color:var(--gold)]" />
      <p className="text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
        {body}
      </p>
    </div>
  );
}

function CliffRow({
  d,
  v,
  last,
}: {
  d: string;
  v: string;
  last?: boolean;
}) {
  return (
    <tr>
      <td
        className={`py-2.5 pr-4 ${
          last ? "" : "border-b border-[color:var(--hairline)]"
        }`}
      >
        {d}
      </td>
      <td
        className={`py-2.5 pr-4 text-right font-display text-[color:var(--basalt)] ${
          last ? "" : "border-b border-[color:var(--hairline)]"
        }`}
      >
        {v}
      </td>
    </tr>
  );
}

function Lever({
  n,
  title,
  body,
  href,
  cta,
}: {
  n: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="bg-[color:var(--bone)] p-7 md:p-8 flex flex-col gap-3 shadow-[inset_0_1px_0_rgba(239,232,212,0.6),inset_0_-1px_0_rgba(31,28,22,0.18)]">
      <div className="flex items-baseline gap-4">
        <span className="font-display text-[24px] text-[color:var(--basalt-3)] leading-none">
          {n}
        </span>
        <span className="font-display uppercase text-[18px] tracking-[0.03em] text-[color:var(--basalt)]">
          {title}
        </span>
      </div>
      <div className="w-8 h-0.5 bg-[color:var(--gold)]" />
      <p className="text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
        {body}
      </p>
      <Link
        href={href}
        className="mt-1 text-[11px] small-caps tracking-[0.14em] text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
      >
        {cta} →
      </Link>
    </div>
  );
}

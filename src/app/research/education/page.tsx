import Link from "next/link";
import type { Metadata } from "next";
import {
  FLAGSHIP,
  listEducationDocs,
  EDUCATION_GITHUB,
  type EducationDoc,
} from "@/lib/education";

// /research/education — the education-atlas corpus hub. Bucket Foundation's
// founding research for its education-reform mission. Stone-bone styling
// matches /research and /research/papers.

export const metadata: Metadata = {
  title: "Education research · the education-atlas corpus",
  description:
    "Bucket Foundation's founding education-reform research: The Knowledge-Access Gradient plus the full education-atlas corpus — the quantitative problem atlas, the reform thesis, and structural deep-dives. Free to read.",
  alternates: { canonical: "/research/education" },
  openGraph: {
    type: "website",
    url: "https://www.bucket.foundation/research/education",
    title: "Education research · bucket.foundation",
    description:
      "The education-atlas corpus: The Knowledge-Access Gradient, the quantitative problem atlas, the reform thesis, and structural deep-dives. The evidence base for Bucket's education-reform mission.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Education research · bucket.foundation",
    description:
      "The education-atlas corpus — the evidence base for Bucket's education-reform mission. Free to read.",
  },
};

const GROUP_ORDER: EducationDoc["group"][] = [
  "atlas",
  "thesis",
  "foundations",
  "deep",
  "landscape",
];

export default function Page() {
  const docs = listEducationDocs();
  const byGroup = GROUP_ORDER.map((g) => ({
    group: g,
    label: docs.find((d) => d.group === g)?.groupLabel ?? g,
    docs: docs.filter((d) => d.group === g),
  })).filter((s) => s.docs.length > 0);

  return (
    <main className="stone-bone relative grain">
      <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-14 md:py-32">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          § Research · education
        </div>
        <h1 className="font-display uppercase text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          the education{" "}
          <span className="inlay-gold">corpus.</span>
        </h1>
        <p className="mt-7 text-[17px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          The education-atlas is Bucket Foundation&rsquo;s founding research for
          its{" "}
          <Link
            href="/mission"
            className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            education-reform mission
          </Link>
          . It maps three crises, a ~270× access cliff, and a consume-vs-produce
          gap where 99.86% of humanity only ever consumes knowledge. Every number
          traces to an authoritative source. Free to read.
        </p>
        <p className="mt-4 text-[13px] text-[color:var(--basalt-3)] max-w-2xl">
          A Bucket Foundation research corpus / working papers. DOI:{" "}
          <span className="text-[color:var(--basalt-2)]">pending</span> (no
          minted Zenodo record yet). Source:{" "}
          <a
            href={EDUCATION_GITHUB}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            github.com/bucket-foundation/education-atlas ↗
          </a>
        </p>

        <div className="carved-rule max-w-xs mt-10" />

        {/* Flagship */}
        <div className="mt-12 small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">
          § The flagship synthesis
        </div>
        <Link
          href={`/research/education/${FLAGSHIP.slug}`}
          className="block mt-5 bg-[color:var(--bone)] p-7 md:p-9 shadow-[inset_0_1px_0_rgba(239,232,212,0.6),inset_0_-1px_0_rgba(31,28,22,0.18)] border border-[color:var(--hairline)]"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
              {FLAGSHIP.venue} · {FLAGSHIP.version} · {FLAGSHIP.date}
            </span>
            <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
              DOI pending · {FLAGSHIP.license}
            </span>
          </div>
          <h2 className="mt-3 font-display text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.15] text-[color:var(--basalt)]">
            {FLAGSHIP.title}
          </h2>
          <div className="w-8 h-0.5 bg-[color:var(--gold)] mt-4" />
          <p className="mt-4 text-[15px] leading-[1.7] text-[color:var(--basalt-2)]">
            {FLAGSHIP.subtitle}
          </p>
          <p className="mt-4 text-[14px] leading-[1.7] text-[color:var(--basalt-2)] line-clamp-4">
            {FLAGSHIP.abstract[0]}
          </p>
          <div className="mt-5 text-[11px] small-caps tracking-[0.14em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4">
            read the synthesis →
          </div>
        </Link>

        {/* Corpus, grouped */}
        {byGroup.map((section) => (
          <div key={section.group}>
            <div className="mt-14 small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">
              § {section.label}
            </div>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-px bg-[color:var(--hairline)] grid-hairlines">
              {section.docs.map((d) => (
                <Link
                  key={d.slug}
                  href={`/research/education/${d.slug}`}
                  className="block bg-[color:var(--bone)] p-6 md:p-7 h-full shadow-[inset_0_1px_0_rgba(239,232,212,0.6),inset_0_-1px_0_rgba(31,28,22,0.18)]"
                >
                  <h3 className="font-display text-[clamp(1.05rem,2vw,1.35rem)] leading-[1.2] text-[color:var(--basalt)]">
                    {d.title}
                  </h3>
                  <div className="w-7 h-0.5 bg-[color:var(--gold)] mt-3" />
                  <p className="mt-3 text-[13px] leading-[1.65] text-[color:var(--basalt-2)]">
                    {d.blurb}
                  </p>
                  <div className="mt-4 text-[11px] small-caps tracking-[0.14em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4">
                    read on-site →
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-16 flex flex-wrap gap-x-6 gap-y-3 text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
          <Link
            href="/research/papers"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            atlas papers
          </Link>
          <Link
            href="/mission"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            the reform mission
          </Link>
          <Link
            href="/research"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            research hub
          </Link>
        </div>
      </div>
    </main>
  );
}

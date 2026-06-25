import Link from "next/link";
import { listPapers } from "@/lib/papers";

// /research/papers — the Bucket-published papers index. First paper: the
// research-atlas funding-landscape preprint. Stone-bone styling matches
// /research, /research/tools and /research/datasets.

export const metadata = {
  title: "Papers · primary research",
  description:
    "Papers published by Bucket Foundation. Free to read, born with a real DOI, citeable forever.",
  alternates: { canonical: "/research/papers" },
  openGraph: {
    type: "website",
    url: "https://www.bucket.foundation/research/papers",
    title: "Papers · primary research — bucket.foundation",
    description:
      "Primary research published by Bucket Foundation: free to read, born with a real DOI via Zenodo, fully reproducible, citeable forever.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Papers · primary research — bucket.foundation",
    description:
      "Primary research, free to read, born with a real DOI, fully reproducible.",
  },
};

export default function Page() {
  const papers = listPapers();

  return (
    <main className="stone-bone relative grain">
      <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-14 md:py-32">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          § Research · papers
        </div>
        <h1 className="font-display uppercase text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          read the{" "}
          <span className="inlay-gold">research.</span>
        </h1>
        <p className="mt-7 text-[17px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Papers published by Bucket Foundation on the research-atlas graph and
          the canon. Each is free to read, born with a real DOI via Zenodo, and
          fully reproducible — every headline number pinned by a test suite. For
          the education-reform research corpus, see{" "}
          <Link
            href="/research/education"
            className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            the education-atlas
          </Link>
          .
        </p>

        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-14 flex flex-col gap-px bg-[color:var(--hairline)] grid-hairlines">
          {papers.map((p) => (
            <Link
              key={p.slug}
              href={`/research/papers/${p.slug}`}
              className="block bg-[color:var(--bone)] p-7 md:p-9 shadow-[inset_0_1px_0_rgba(239,232,212,0.6),inset_0_-1px_0_rgba(31,28,22,0.18)]"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
                  {p.venue} · {p.date}
                </span>
                <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
                  {p.license}
                </span>
              </div>
              <h2 className="mt-3 font-display text-[clamp(1.25rem,2.6vw,1.85rem)] leading-[1.2] text-[color:var(--basalt)]">
                {p.title}
              </h2>
              <div className="w-8 h-0.5 bg-[color:var(--gold)] mt-4" />
              <p className="mt-4 text-[14px] leading-[1.7] text-[color:var(--basalt-2)] line-clamp-4">
                {p.abstract[0]}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
                <span>{p.authors}</span>
                <span className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4">
                  read paper →
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap gap-x-6 gap-y-3 text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
          <Link
            href="/research/atlas"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            the research-atlas graph
          </Link>
          <Link
            href="/research/datasets"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            open datasets
          </Link>
          <Link
            href="/research/education"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            education corpus
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

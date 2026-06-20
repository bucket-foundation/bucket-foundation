import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPaper, listPapers } from "@/lib/papers";

// /research/papers/[slug] — a single paper: title, abstract, the figures, a
// link to the PDF, the DOI, and a citation block. Statically generated from
// src/lib/papers.ts (content vendored from the research-atlas repo).

export function generateStaticParams() {
  return listPapers().map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const p = getPaper(params.slug);
  if (!p) return { title: "Paper not found — bucket.foundation" };
  return {
    title: `${p.title.slice(0, 70)}… — bucket.foundation`,
    description: p.abstract[0]?.slice(0, 180),
  };
}

export default function Page({ params }: { params: { slug: string } }) {
  const p = getPaper(params.slug);
  if (!p) notFound();

  return (
    <main className="stone-bone relative grain">
      <div className="max-w-[820px] mx-auto px-4 md:px-6 py-14 md:py-28">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          § Research · paper
        </div>

        <h1 className="font-display text-[clamp(1.5rem,3.6vw,2.6rem)] leading-[1.18] text-[color:var(--basalt)]">
          {p.title}
        </h1>

        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[12px] small-caps tracking-[0.13em] text-[color:var(--basalt-3)]">
          <span>{p.authors}</span>
          <span>{p.affiliation}</span>
          <span>{p.venue} · {p.version}</span>
          <span>{p.date}</span>
          <span>{p.license}</span>
        </div>

        <p className="mt-3 text-[12px] text-[color:var(--basalt-3)]">
          Corpus: {p.corpusLine}
        </p>

        {/* Action row: PDF + DOI + GitHub */}
        <div className="mt-7 flex flex-wrap items-center gap-4">
          <a
            href={p.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex font-display uppercase text-[13px] tracking-[0.06em] px-5 py-2.5 bg-[color:var(--basalt)] text-[color:var(--bone)] hover:bg-[color:var(--aegean-deep)] transition-colors"
          >
            read the PDF ↗
          </a>
          <a
            href={p.doiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex font-display uppercase text-[13px] tracking-[0.06em] px-5 py-2.5 border border-[color:var(--basalt)] text-[color:var(--basalt)] hover:bg-[color:var(--basalt)] hover:text-[color:var(--bone)] transition-colors"
          >
            DOI ↗
          </a>
          <a
            href={p.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            code + data on github ↗
          </a>
        </div>

        <div className="carved-rule max-w-xs mt-10" />

        {/* Abstract */}
        <h2 className="mt-10 font-display uppercase text-[16px] tracking-[0.1em] text-[color:var(--basalt)]">
          Abstract
        </h2>
        <div className="mt-4 flex flex-col gap-4">
          {p.abstract.map((para, i) => (
            <p
              key={i}
              className="text-[15px] leading-[1.85] text-[color:var(--basalt-2)]"
            >
              {para}
            </p>
          ))}
        </div>

        {/* Highlights */}
        {p.highlights.length > 0 && (
          <>
            <h2 className="mt-12 font-display uppercase text-[16px] tracking-[0.1em] text-[color:var(--basalt)]">
              Key findings
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {p.highlights.map((h, i) => (
                <li
                  key={i}
                  className="flex gap-3 text-[15px] leading-[1.75] text-[color:var(--basalt-2)]"
                >
                  <span className="mt-2 inline-block w-1.5 h-1.5 rounded-full bg-[color:var(--gold)] shrink-0" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Figures */}
        <h2 className="mt-12 font-display uppercase text-[16px] tracking-[0.1em] text-[color:var(--basalt)]">
          Figures
        </h2>
        <div className="mt-6 flex flex-col gap-10">
          {p.figures.map((fig) => (
            <figure key={fig.src}>
              <div className="border border-[color:var(--hairline)] bg-white p-3 md:p-5">
                <Image
                  src={fig.src}
                  alt={fig.alt}
                  width={1200}
                  height={800}
                  className="w-full h-auto"
                />
              </div>
              <figcaption className="mt-3 text-[13px] leading-[1.7] text-[color:var(--basalt-3)]">
                {fig.caption}
              </figcaption>
            </figure>
          ))}
        </div>

        {/* Citation */}
        <h2 className="mt-14 font-display uppercase text-[16px] tracking-[0.1em] text-[color:var(--basalt)]">
          Cite this paper
        </h2>
        <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
          DOI:{" "}
          <a
            href={p.doiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4 break-all"
          >
            {p.doi}
          </a>
        </p>
        <pre className="mt-4 overflow-x-auto text-[12px] leading-[1.6] bg-[color:var(--bone-2,var(--bone))] border border-[color:var(--hairline)] p-5 text-[color:var(--basalt)] whitespace-pre">
{p.bibtex}
        </pre>

        <div className="mt-14 flex flex-wrap gap-x-6 gap-y-3 text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
          <Link
            href="/research/papers"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            ← all papers
          </Link>
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
        </div>
      </div>
    </main>
  );
}

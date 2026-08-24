import Link from "next/link";
import Script from "next/script";
import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { Markdown } from "@/lib/markdown";
import { FLAGSHIP, readEducationDoc } from "@/lib/education";

const SITE = "https://www.bucket.foundation";

// /research/education/knowledge-access-gradient, the flagship education-atlas
// synthesis, rendered on-site as a first-class paper-like page from the
// vendored markdown (src/content/education/THE-KNOWLEDGE-ACCESS-GRADIENT.md).
// Minted DOI 10.5281/zenodo.22083720, presented as a Bucket Foundation working paper.

export const metadata: Metadata = {
  title: `${FLAGSHIP.title} · education research`,
  description: FLAGSHIP.abstract[0].slice(0, 180),
  alternates: { canonical: `/research/education/${FLAGSHIP.slug}` },
  openGraph: {
    type: "article",
    url: `${SITE}/research/education/${FLAGSHIP.slug}`,
    title: FLAGSHIP.title,
    description: FLAGSHIP.subtitle,
    publishedTime: FLAGSHIP.date,
    authors: ["Gianangelo Dichio"],
    tags: ["education", "SDG 4", "open knowledge", "education reform"],
  },
  twitter: {
    card: "summary_large_image",
    title: FLAGSHIP.title,
    description: FLAGSHIP.subtitle,
  },
};

function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    "@id": `${SITE}/research/education/${FLAGSHIP.slug}#article`,
    headline: FLAGSHIP.title,
    name: FLAGSHIP.title,
    url: `${SITE}/research/education/${FLAGSHIP.slug}`,
    author: {
      "@type": "Person",
      name: "Gianangelo Dichio",
      url: "https://github.com/gianyrox",
    },
    datePublished: FLAGSHIP.date,
    publisher: {
      "@type": ["NGO", "Organization"],
      name: "Bucket Foundation",
      url: SITE,
    },
    inLanguage: "en",
    isAccessibleForFree: true,
    license: "https://creativecommons.org/licenses/by/4.0/",
    abstract: FLAGSHIP.abstract.join(" "),
    description: FLAGSHIP.abstract[0],
    image: FLAGSHIP.figures.map((f) => `${SITE}${f.src}`),
    identifier: {
      "@type": "PropertyValue",
      propertyID: "DOI",
      value: FLAGSHIP.doi,
    },
    sameAs: FLAGSHIP.doiUrl,
  };
}

export default function Page() {
  const md = readEducationDoc(FLAGSHIP.doc);
  return (
    <PageShell
      eyebrow="§ education research · flagship working paper"
      title={FLAGSHIP.title}
      subtitle={FLAGSHIP.subtitle}
    >
      <Script
        id="ld-education-flagship"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
      />

      {/* Meta + action row */}
      <div className="mb-8 p-5 border hairline bg-[color:var(--bone-3)] text-sm text-[color:var(--parchment-dim)]">
        <div className="flex flex-wrap gap-x-5 gap-y-1 small-caps text-[11px] text-[color:var(--gold)] mb-3">
          <span>{FLAGSHIP.authors}</span>
          <span>
            {FLAGSHIP.venue} · {FLAGSHIP.version}
          </span>
          <span>{FLAGSHIP.date}</span>
          <a
            href={FLAGSHIP.doiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            DOI: {FLAGSHIP.doi}
          </a>
          <span>{FLAGSHIP.license}</span>
        </div>
        <p className="mb-3 text-[13px]">Corpus: {FLAGSHIP.corpusLine}</p>
        <div className="flex flex-wrap items-center gap-4">
          <a
            href={FLAGSHIP.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex font-display uppercase text-[13px] tracking-[0.06em] px-5 py-2.5 bg-[color:var(--gold)] text-[color:var(--ink)] hover:opacity-90 transition"
          >
            read the PDF ↗
          </a>
          <a
            href={FLAGSHIP.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--gold)] hover:text-[color:var(--parchment)] underline-offset-4 underline"
          >
            source on github ↗
          </a>
          <Link
            href="/research/education"
            className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--gold)] hover:text-[color:var(--parchment)] underline-offset-4 underline"
          >
            the full corpus
          </Link>
        </div>
      </div>

      <Markdown source={md} />

      <hr className="my-12 border-t hairline" />
      <div className="flex flex-wrap gap-x-6 gap-y-3 small-caps text-[11px] text-[color:var(--gold)]">
        <Link href="/research/education" className="hover:text-[color:var(--parchment)] underline-offset-4 underline">
          ← education corpus
        </Link>
        <Link href="/mission" className="hover:text-[color:var(--parchment)] underline-offset-4 underline">
          the reform mission
        </Link>
        <Link href="/research/papers" className="hover:text-[color:var(--parchment)] underline-offset-4 underline">
          atlas papers
        </Link>
      </div>
    </PageShell>
  );
}

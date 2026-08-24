import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import { Markdown } from "@/lib/markdown";
import {
  getEducationDoc,
  listEducationDocs,
  readEducationDoc,
} from "@/lib/education";

const SITE = "https://www.bucket.foundation";

// /research/education/[slug], a single education-atlas corpus document,
// rendered on-site from vendored markdown with the shared long-form renderer.
// The flagship lives at its own static route; this handles the rest of the
// corpus (atlas, thesis, foundations, deep, landscape).

export function generateStaticParams() {
  return listEducationDocs().map((d) => ({ slug: d.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const d = getEducationDoc(params.slug);
  if (!d) return { title: "Document not found" };
  return {
    title: `${d.title} · education research`,
    description: d.blurb,
    alternates: { canonical: `/research/education/${d.slug}` },
    openGraph: {
      type: "article",
      url: `${SITE}/research/education/${d.slug}`,
      title: d.title,
      description: d.blurb,
    },
    twitter: {
      card: "summary_large_image",
      title: d.title,
      description: d.blurb,
    },
  };
}

export default function Page({ params }: { params: { slug: string } }) {
  const d = getEducationDoc(params.slug);
  if (!d) notFound();
  const md = readEducationDoc(d.doc);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${SITE}/research/education/${d.slug}#article`,
    headline: d.title,
    url: `${SITE}/research/education/${d.slug}`,
    author: {
      "@type": "Person",
      name: "Gianangelo Dichio",
      url: "https://github.com/gianyrox",
    },
    publisher: {
      "@type": ["NGO", "Organization"],
      name: "Bucket Foundation",
      url: SITE,
    },
    inLanguage: "en",
    isAccessibleForFree: true,
    license: "https://creativecommons.org/licenses/by/4.0/",
    description: d.blurb,
    isPartOf: {
      "@type": "CreativeWork",
      name: "education-atlas",
      url: `${SITE}/research/education`,
    },
  };

  return (
    <PageShell eyebrow={`§ education research · ${d.groupLabel}`} title={d.title}>
      <Script
        id={`ld-education-${d.slug}`}
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 small-caps text-[11px] text-[color:var(--gold)]">
        <span>Bucket Foundation · education-atlas working paper</span>
        <span>DOI: pending · CC-BY-4.0</span>
        {d.githubUrl && (
          <a
            href={d.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[color:var(--parchment)] underline-offset-4 underline"
          >
            source on github ↗
          </a>
        )}
      </div>

      <Markdown source={md} />

      <hr className="my-12 border-t hairline" />
      <div className="flex flex-wrap gap-x-6 gap-y-3 small-caps text-[11px] text-[color:var(--gold)]">
        <Link href="/research/education" className="hover:text-[color:var(--parchment)] underline-offset-4 underline">
          ← education corpus
        </Link>
        <Link href="/research/education/knowledge-access-gradient" className="hover:text-[color:var(--parchment)] underline-offset-4 underline">
          the flagship synthesis
        </Link>
        <Link href="/mission" className="hover:text-[color:var(--parchment)] underline-offset-4 underline">
          the reform mission
        </Link>
      </div>
    </PageShell>
  );
}

// /canon/<slug>/figures/<figure>, single figure page.
//
// Renders the canonical record for one of the 99 canon-figures from
// `canon-figures/figures.json`, plus (when present) the hand-written
// bio markdown from `canon-figures/bios/<id>.md`. External links go to
// real sources (Wikipedia, Wikidata, OpenAlex, Google Scholar) by name
// search, *not* to the stale bucket-research repo that used to host
// per-figure subdirectories that never got built out.

import Link from "next/link";
import { notFound } from "next/navigation";
import { BRANCHES, getBranch, getFigure, FIGURES_TREE } from "@/lib/canon";
import { getFigureBio, hasFigureBio, renderBioMarkdown } from "@/lib/canon-figures";

export function generateStaticParams() {
  const out: { slug: string; figure: string }[] = [];
  for (const b of BRANCHES) for (const f of b.figures) out.push({ slug: b.slug, figure: f.slug });
  return out;
}

export function generateMetadata({ params }: { params: { slug: string; figure: string } }) {
  const f = getFigure(params.slug, params.figure);
  if (!f) return { title: "Figure · bucket.foundation" };
  return { title: `${f.name} — canon · bucket.foundation`, description: f.note };
}

// External-research links. Each is a real URL that resolves; nothing is
// promised that doesn't exist. Wikipedia / Wikidata / OpenAlex / Google
// Scholar all accept name-search queries directly via URL.
function externalLinks(name: string) {
  const q = encodeURIComponent(name);
  return [
    {
      label: "Wikipedia",
      note: "primary biographical entry",
      href: `https://en.wikipedia.org/w/index.php?search=${q}`,
    },
    {
      label: "Wikidata",
      note: "structured identifiers (VIAF, GND, ORCID, ISNI)",
      href: `https://www.wikidata.org/w/index.php?search=${q}`,
    },
    {
      label: "OpenAlex",
      note: "OA-indexed authored works + citation graph",
      href: `https://openalex.org/works?search=${q}&sort=cited_by_count:desc`,
    },
    {
      label: "Google Scholar",
      note: "works authored, works citing — broadest coverage",
      href: `https://scholar.google.com/scholar?q=${q}`,
    },
  ];
}

export default function Page({ params }: { params: { slug: string; figure: string } }) {
  const b = getBranch(params.slug);
  const f = getFigure(params.slug, params.figure);
  if (!b || !f) notFound();

  const bioMd = getFigureBio(f.slug);
  const bioHtml = bioMd ? renderBioMarkdown(bioMd) : null;
  const ext = externalLinks(f.name);

  const figEditUrl = `${FIGURES_TREE}/bios/${f.slug}.md`;
  const figJsonUrl = `${FIGURES_TREE}/figures.json`;

  return (
    <main className="min-h-screen">
      <header className="border-b hairline">
        <div className="max-w-4xl mx-auto px-4 md:px-6 pt-14 md:pt-24 pb-10 md:pb-16">
          <div className="small-caps text-[11px] text-[color:var(--gold)] mb-6">
            <Link href="/canon" className="hover:text-[color:var(--parchment)]">§ canon</Link>{" "}
            <span className="text-[color:var(--parchment-dim)]">/ </span>
            <Link href={`/canon/${b.slug}`} className="hover:text-[color:var(--parchment)]">{b.name}</Link>{" "}
            <span className="text-[color:var(--parchment-dim)]">/ figure</span>
          </div>
          <h1 className="font-serif-display text-[clamp(2.5rem,6vw,5rem)] leading-[1.05] text-[color:var(--parchment)]">
            {f.name}
          </h1>
          {f.note && (
            <div className="mt-4 text-lg text-[color:var(--parchment-dim)]">{f.note}</div>
          )}
          {/* Tag chips */}
          {f.tags && f.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5">
              {f.tags.map((t) => (
                <span
                  key={t}
                  className="small-caps text-[10px] text-[color:var(--basalt-2)] border hairline px-2 py-1"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-4 md:px-6 py-12 md:py-16 space-y-12">
        {/* Primary works, pulled from figures.json. Real, citable. */}
        {f.primary_works && f.primary_works.length > 0 && (
          <div>
            <h2 className="font-serif-display text-2xl text-[color:var(--parchment)] mb-5">
              Primary works
              <span className="ml-3 small-caps text-[11px] text-[color:var(--parchment-dim)]">
                · {f.primary_works.length}
              </span>
            </h2>
            <ul className="space-y-3">
              {f.primary_works.map((w, i) => (
                <li key={i} className="flex items-baseline gap-3 leading-relaxed">
                  <span
                    className="font-mono-mark text-[11px] text-[color:var(--gold)] flex-shrink-0"
                    style={{ minWidth: "3rem" }}
                  >
                    {w.year || "—"}
                  </span>
                  <div>
                    <span className="text-[color:var(--parchment)]">{w.title}</span>
                    {w.language && (
                      <span className="ml-2 small-caps text-[10px] text-[color:var(--parchment-dim)]">
                        · {w.language}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Cross-branch chips */}
        {f.cross_branches && f.cross_branches.length > 0 && (
          <div>
            <h2 className="font-serif-display text-2xl text-[color:var(--parchment)] mb-5">
              Cross-branch
            </h2>
            <div className="flex flex-wrap gap-2">
              {f.cross_branches.map((cb) => {
                // cb is the directory name like "06-cosmology", strip the prefix
                const slug = cb.replace(/^\d+-/, "");
                return (
                  <Link
                    key={cb}
                    href={`/canon/${slug}`}
                    className="small-caps text-[10px] text-[color:var(--gold)] border border-[color:var(--gold)] px-3 py-1.5 hover:text-[color:var(--parchment)] hover:border-[color:var(--parchment)] transition"
                  >
                    {slug.replace(/-/g, " ")}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Bio markdown (if present) */}
        {bioHtml && (
          <div>
            <h2 className="font-serif-display text-2xl text-[color:var(--parchment)] mb-5">
              Biography
            </h2>
            <article
              className="canon-bio max-w-3xl text-[color:var(--parchment-dim)] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: bioHtml }}
            />
            <style>{`
              .canon-bio h2 { margin-top: 2.5rem; margin-bottom: 1rem; font-family: var(--font-fraunces); font-size: 1.6rem; color: var(--parchment); }
              .canon-bio h3 { margin-top: 2rem; margin-bottom: 0.5rem; font-family: var(--font-fraunces); font-size: 1.2rem; color: var(--parchment); }
              .canon-bio p { margin-bottom: 1.1em; max-width: 70ch; }
              .canon-bio hr { margin: 2rem 0; border: none; border-top: 1px solid var(--hairline); }
              .canon-bio code { font-family: var(--font-jetbrains); font-size: 0.85em; color: var(--gold); background: rgba(0,0,0,0.04); padding: 0.05em 0.35em; border-radius: 2px; }
              .canon-bio a { color: var(--gold); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
              .canon-bio a:hover { color: var(--parchment); }
              .canon-bio strong { color: var(--parchment); font-weight: 500; }
              .canon-bio em { font-style: italic; }
              .canon-bio .bio-meta { display: grid; gap: 0.5rem; margin: 0 0 1.5rem 0; padding: 1rem; background: rgba(0,0,0,0.03); border: 1px solid var(--hairline); }
              .canon-bio .bio-meta > div { display: grid; grid-template-columns: 13rem 1fr; gap: 1rem; font-size: 0.9rem; }
              .canon-bio .bio-meta dt { color: var(--gold); font-family: var(--font-jetbrains); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.15em; padding-top: 0.15rem; }
              .canon-bio .bio-meta dd { color: var(--parchment); margin: 0; }
            `}</style>
          </div>
        )}

        {!bioHtml && (
          <div className="border hairline p-6 text-[color:var(--parchment-dim)] text-sm leading-relaxed">
            <div className="small-caps text-[10px] text-[color:var(--gold)] mb-2">Biography pending</div>
            No hand-written bio for{" "}
            <span className="text-[color:var(--parchment)]">{f.name}</span> yet. The
            metadata above (lifespan, region, tradition, primary works, tags) is the
            canon record from{" "}
            <a href={figJsonUrl} className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]">
              canon-figures/figures.json
            </a>
            . Bios live under{" "}
            <a href={`${FIGURES_TREE}/bios`} className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]">
              canon-figures/bios/
            </a>{" "}
            — contributions welcome.
          </div>
        )}

        {/* External research links, all real, all by name search. */}
        <div>
          <h2 className="font-serif-display text-2xl text-[color:var(--parchment)] mb-5">
            Sources
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[color:var(--hairline)]">
            {ext.map((e) => (
              <li key={e.label}>
                <a
                  href={e.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-[color:var(--bone-2)] p-5 hover:bg-[color:var(--bone-3)] transition"
                >
                  <div className="font-serif-display text-lg text-[color:var(--parchment)]">
                    {e.label} ↗
                  </div>
                  <div className="mt-1 text-sm text-[color:var(--parchment-dim)]">{e.note}</div>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Edit / contribute */}
        <div className="border-t hairline pt-8 flex flex-wrap gap-4 small-caps text-[11px]">
          <a
            href={figEditUrl}
            className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]"
          >
            {hasFigureBio(f.slug) ? "edit bio on github ↗" : "add bio on github ↗"}
          </a>
          <a
            href={figJsonUrl}
            className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]"
          >
            edit metadata (figures.json) ↗
          </a>
          <Link
            href="/join"
            className="text-[color:var(--parchment)] hover:text-[color:var(--gold)]"
          >
            contribute canon →
          </Link>
        </div>
      </section>
    </main>
  );
}

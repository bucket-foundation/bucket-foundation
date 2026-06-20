// /canon/[slug] — branch page. Renders README scope + sortable entries table
// from the filesystem PLUS the figures (from canon-figures/figures.json,
// wired in src/lib/canon.ts) and per-concept claim cards (from
// bucket-canon/<num>-<slug>/sub-claims/<concept>/). Falls back to static
// metadata for legacy slugs.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getBranches, getBranch, getBranchEntries } from "@/lib/canon-fs";
import { BRANCHES as STATIC_BRANCHES, getBranch as getStaticBranch, REPO_TREE, DRIVE_URL } from "@/lib/canon";
import { getClaimsForBranch } from "@/lib/canon-claims";
import BranchEntriesTable from "./BranchEntriesTable";

export const dynamic = "force-static";

export function generateStaticParams() {
  // Union of canonical/disk branches and any static-only legacy slugs
  const fs = getBranches().map((b) => ({ slug: b.slug }));
  const stat = STATIC_BRANCHES.map((b) => ({ slug: b.slug }));
  const seen = new Set<string>();
  return [...fs, ...stat].filter((p) => {
    if (seen.has(p.slug)) return false;
    seen.add(p.slug);
    return true;
  });
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const b = getBranch(params.slug) || getStaticBranch(params.slug);
  if (!b) return { title: "Canon" };
  const name = (b as any).name;
  const note = (b as any).note as string | undefined;
  const description = note
    ? `The ${name} branch of the bucket canon — ${note}. Foundations only: axioms, real math, laws, principles, primary derivations. Free to read, free to cite.`
    : `The ${name} branch of the bucket canon — foundations only: axioms, laws, first principles, primary derivations. Free to read, free to cite.`;
  return {
    title: `${name} — canon`,
    description,
    alternates: { canonical: `/canon/${params.slug}` },
    openGraph: {
      type: "website" as const,
      url: `https://www.bucket.foundation/canon/${params.slug}`,
      title: `${name} — the bucket canon`,
      description,
    },
  };
}

export default function Page({ params }: { params: { slug: string } }) {
  const fs = getBranch(params.slug);
  const stat = getStaticBranch(params.slug);
  if (!fs && !stat) notFound();

  const numeral = fs?.numeral || (stat as any)?.num || "";
  const name = fs?.name || (stat as any)?.name || params.slug;
  const status = fs?.status || (stat ? "in progress" : "not yet opened");
  const readme = fs?.readme || null;
  const entries = fs ? getBranchEntries(params.slug) : [];

  // NEW: figures (from canon-figures/figures.json via canon.ts) + per-concept
  // claim cards (from bucket-canon/<num>-<slug>/sub-claims/). These are the
  // two big "content" lists that were missing from every branch page.
  const figures = stat?.figures ?? [];
  const { total: claimsTotal, concepts: claimsByConcept } = getClaimsForBranch(params.slug);

  // Pull the first 1-3 paragraphs from README as scope summary
  const readmeIntro = readme ? extractIntro(readme) : null;

  const isBiophysics = params.slug === "biophysics";

  return (
    <main className="min-h-screen">
      <header className="border-b hairline">
        <div className="max-w-5xl mx-auto px-4 md:px-6 pt-14 md:pt-24 pb-10 md:pb-16">
          <div className="small-caps text-[11px] text-[color:var(--gold)] mb-6">
            <Link href="/canon" className="hover:text-[color:var(--basalt)]">§ canon</Link>{" "}
            <span className="text-[color:var(--parchment-dim)]">/ {numeral}</span>
          </div>
          <h1 className="font-serif-display text-[clamp(2.5rem,6vw,5rem)] leading-[1.05] text-[color:var(--basalt)] capitalize">
            {name}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-3 small-caps text-[10px]">
            <span className="border border-[color:var(--hairline)] px-2 py-1 text-[color:var(--gold)]">
              {status}
            </span>
            {fs && (
              <>
                <span className="text-[color:var(--parchment-dim)]">{fs.entryCount} entries</span>
                <span className="text-[color:var(--parchment-dim)]">· {fs.subfolders.length} sub-folders</span>
              </>
            )}
            {figures.length > 0 && (
              <span className="text-[color:var(--parchment-dim)]">· {figures.length} figures</span>
            )}
            {claimsTotal > 0 && (
              <span className="text-[color:var(--parchment-dim)]">· {claimsTotal} claim cards</span>
            )}
          </div>
          {readmeIntro && (
            <p className="mt-6 max-w-3xl text-[color:var(--parchment-dim)] leading-relaxed text-pretty">
              {readmeIntro}
            </p>
          )}
          {!readmeIntro && stat && (
            <p className="mt-6 max-w-3xl text-[color:var(--parchment-dim)] leading-relaxed text-pretty">
              {(stat as any).thesis}
            </p>
          )}
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 md:px-6 py-12 md:py-16 space-y-12">
        {/* FIGURES ---------------------------------------------------- */}
        {figures.length > 0 && (
          <div>
            <h2 className="font-serif-display text-2xl text-[color:var(--basalt)] mb-6">
              Figures
              <span className="ml-3 small-caps text-[11px] text-[color:var(--parchment-dim)]">
                · {figures.length} canonical
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[color:var(--hairline)]">
              {figures.map((f) => (
                <Link
                  key={f.slug}
                  href={`/canon/${params.slug}/figures/${f.slug}`}
                  className="block bg-[color:var(--bone-2)] p-5 hover:bg-[color:var(--bone-3)] transition"
                >
                  <div className="font-serif-display text-lg text-[color:var(--basalt)] leading-tight">
                    {f.name}
                  </div>
                  {f.note && (
                    <div className="mt-1.5 text-[12px] text-[color:var(--parchment-dim)] leading-snug">
                      {f.note}
                    </div>
                  )}
                  {f.tags && f.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {f.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="text-[9px] uppercase tracking-[0.15em] text-[color:var(--basalt-2)] border hairline px-1.5 py-0.5"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CLAIMS BY CONCEPT ----------------------------------------- */}
        {claimsByConcept.length > 0 && (
          <div>
            <h2 className="font-serif-display text-2xl text-[color:var(--basalt)] mb-6">
              Claim cards
              <span className="ml-3 small-caps text-[11px] text-[color:var(--parchment-dim)]">
                · {claimsTotal} across {claimsByConcept.length} concepts
              </span>
            </h2>
            <div className="space-y-8">
              {claimsByConcept.map(({ concept, claims }) => (
                <div key={concept}>
                  <h3 className="font-serif-display text-lg text-[color:var(--basalt)] mb-3 capitalize">
                    <Link
                      href={`/canon/claims/${concept}`}
                      className="hover:text-[color:var(--gold)]"
                    >
                      {concept.replace(/-/g, " ")}
                    </Link>
                    <span className="ml-2 small-caps text-[10px] text-[color:var(--parchment-dim)]">
                      · {claims.length}
                    </span>
                  </h3>
                  <ul className="space-y-1.5">
                    {claims.slice(0, 6).map((c) => (
                      <li key={c.slug} className="text-[14px] leading-relaxed">
                        <Link
                          href={`/canon/claims/${c.concept}/${c.slug}`}
                          className="text-[color:var(--basalt-2)] hover:text-[color:var(--gold)]"
                        >
                          {c.title.length > 110 ? c.title.slice(0, 110) + "…" : c.title}
                        </Link>
                      </li>
                    ))}
                    {claims.length > 6 && (
                      <li className="text-[11px] small-caps">
                        <Link
                          href={`/canon/claims/${concept}`}
                          className="text-[color:var(--gold)] hover:text-[color:var(--basalt)]"
                        >
                          + {claims.length - 6} more →
                        </Link>
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CANON_INDEX ENTRIES (existing) ----------------------------- */}
        {entries.length > 0 ? (
          <div>
            <h2 className="font-serif-display text-2xl text-[color:var(--basalt)] mb-6">Entries</h2>
            <BranchEntriesTable entries={entries} branchSlug={params.slug} />
          </div>
        ) : fs && figures.length === 0 && claimsByConcept.length === 0 ? (
          <div className="bg-[color:var(--bone-2)] p-8 border hairline">
            <div className="font-serif-display text-xl text-[color:var(--basalt)] mb-2">
              Sub-folders scaffolded. Entries pending.
            </div>
            <div className="text-sm text-[color:var(--parchment-dim)]">
              {fs.subfolders.length > 0
                ? `${fs.subfolders.length} sub-folders are open. CANON_INDEX rows have not yet been promoted.`
                : "This branch is intake-stage. Research is in motion."}
            </div>
            {fs.subfolders.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {fs.subfolders.map((s) => (
                  <span key={s} className="text-xs text-[color:var(--basalt-2)] border hairline px-2 py-1 small-caps">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* SUB-FOLDERS (always shown when present, after figures + claims) */}
        {fs && fs.subfolders.length > 0 && (figures.length > 0 || claimsByConcept.length > 0) && (
          <div>
            <h2 className="font-serif-display text-2xl text-[color:var(--basalt)] mb-4">
              Sub-folders
              <span className="ml-3 small-caps text-[11px] text-[color:var(--parchment-dim)]">
                · {fs.subfolders.length} open
              </span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {fs.subfolders.map((s) => (
                <a
                  key={s}
                  href={`https://github.com/bucket-foundation/bucket-foundation/tree/main/bucket-canon/${fs.dir}/${s}`}
                  className="text-xs text-[color:var(--basalt-2)] border hairline px-3 py-1.5 small-caps hover:text-[color:var(--gold)] hover:border-[color:var(--gold)] transition"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>
        )}

        {isBiophysics && (
          <div>
            <h2 className="font-serif-display text-2xl text-[color:var(--basalt)] mb-6">_sources</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[color:var(--hairline)]">
              <SourceCard
                title="Kruse Index"
                note="460-post corpus, citation-only, one partial source."
                href="/kruse"
              />
              <SourceCard
                title="PubMed"
                note="Reviews on quantum biology, mitochondria, bioelectricity."
                href="https://pubmed.ncbi.nlm.nih.gov"
                external
              />
              <SourceCard
                title="PubChem"
                note="Compound dossiers used as primary sources for biophysics."
                href="https://pubchem.ncbi.nlm.nih.gov"
                external
              />
            </div>
          </div>
        )}

        <div className="border-t hairline pt-8 flex flex-wrap gap-4 small-caps text-[11px]">
          {fs && (
            <a
              href={`https://github.com/bucket-foundation/bucket-foundation/tree/main/bucket-canon/${fs.dir}`}
              className="text-[color:var(--gold)] hover:text-[color:var(--basalt)]"
            >
              open on github ↗
            </a>
          )}
          <a href={DRIVE_URL} className="text-[color:var(--gold)] hover:text-[color:var(--basalt)]">
            bucketdrive ↗
          </a>
          <Link href={`/canon/${params.slug}/feed.xml`} className="text-[color:var(--gold)] hover:text-[color:var(--basalt)]">
            branch feed ↗
          </Link>
          <Link href="/join" className="text-[color:var(--basalt)] hover:text-[color:var(--gold)]">
            contribute canon →
          </Link>
        </div>
      </section>
    </main>
  );
}

function extractIntro(md: string): string | null {
  // Skip headings, take first paragraph
  const lines = md.split(/\r?\n/);
  const para: string[] = [];
  let started = false;
  for (const l of lines) {
    if (l.startsWith("#")) { if (started) break; continue; }
    if (l.trim() === "") {
      if (started) break;
      continue;
    }
    started = true;
    para.push(l.trim());
    if (para.join(" ").length > 600) break;
  }
  const text = para.join(" ").replace(/\*\*/g, "").replace(/`/g, "");
  return text || null;
}

function SourceCard({
  title, note, href, external,
}: { title: string; note: string; href: string; external?: boolean }) {
  const cls = "bg-[color:var(--bone-2)] p-5 hover:bg-[color:var(--bone-3)] transition block";
  const inner = (
    <>
      <div className="font-serif-display text-lg text-[color:var(--basalt)]">{title}</div>
      <div className="mt-1 text-sm text-[color:var(--parchment-dim)]">{note}</div>
    </>
  );
  return external
    ? <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
    : <Link href={href} className={cls}>{inner}</Link>;
}

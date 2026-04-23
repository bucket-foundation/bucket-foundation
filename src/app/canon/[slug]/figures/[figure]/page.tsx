import Link from "next/link";
import { notFound } from "next/navigation";
import { BRANCHES, getBranch, getFigure, REPO_TREE } from "@/lib/canon";

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

export default function Page({ params }: { params: { slug: string; figure: string } }) {
  const b = getBranch(params.slug);
  const f = getFigure(params.slug, params.figure);
  if (!b || !f) notFound();

  const figTree = `${REPO_TREE}/${b.num}-${b.slug}/figures/${f.slug}`;

  return (
    <main className="min-h-screen">
      <header className="border-b hairline">
        <div className="max-w-4xl mx-auto px-6 pt-24 pb-16">
          <div className="small-caps text-[11px] text-[color:var(--gold)] mb-6">
            <Link href="/canon" className="hover:text-[color:var(--parchment)]">§ canon</Link>{" "}
            <span className="text-[color:var(--parchment-dim)]">/ </span>
            <Link href={`/canon/${b.slug}`} className="hover:text-[color:var(--parchment)]">{b.name}</Link>{" "}
            <span className="text-[color:var(--parchment-dim)]">/ figure</span>
          </div>
          <h1 className="font-serif-display text-[clamp(2.5rem,6vw,5rem)] leading-[1.05] text-[color:var(--parchment)]">
            {f.name}
          </h1>
          <div className="mt-4 text-lg text-[color:var(--parchment-dim)]">{f.note}</div>
          <div className="mt-8 font-serif-display text-4xl text-[color:var(--gold)]">
            {f.works.toLocaleString()}
            <span className="ml-3 small-caps text-[11px] text-[color:var(--parchment-dim)]">authored works indexed</span>
          </div>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-6 py-16 space-y-10">
        <Card
          title="Authored works"
          body="Every OpenAlex-indexed work authored by this figure, wrapped in a feed402 §3 envelope (citation + data + receipt). Includes title, authors, year, DOI, venue, citation count, OA status, concept tags."
          link={`${figTree}/works`}
          linkLabel="browse works (github) ↗"
        />
        <Card
          title="Biographies"
          body="Wikipedia primary biography across 11 languages (en · de · fr · es · it · pt · ja · zh · ar · he · ru) plus the Wikidata entity dump. Full en HTML archived for offline."
          link={`${figTree}/biographies`}
          linkLabel="browse biographies ↗"
        />
        <Card
          title="About"
          body="Top-cited open-access works about this figure. Curated seed; contributable via PR on bucket-research."
          link={`${figTree}/about`}
          linkLabel="browse about ↗"
        />

        <div className="pt-10 border-t hairline text-sm text-[color:var(--parchment-dim)]">
          <div className="small-caps text-[11px] text-[color:var(--gold)] mb-3">Pattern</div>
          <p className="leading-relaxed">
            This folder is the prototype for every canon figure. Each figure gets a{" "}
            <code className="font-mono-mark text-[color:var(--gold)]">&lt;branch&gt;/figures/&lt;slug&gt;/</code>{" "}
            directory with the same three-subfolder layout. The future subdomain{" "}
            <code className="font-mono-mark text-[color:var(--gold)]">{f.slug}.bucket.foundation</code>{" "}
            will serve a paid feed402 merchant over this corpus.
          </p>
        </div>
      </section>
    </main>
  );
}

function Card({ title, body, link, linkLabel }: { title: string; body: string; link: string; linkLabel: string }) {
  return (
    <div className="border hairline p-8">
      <h3 className="font-serif-display text-2xl text-[color:var(--parchment)] mb-3">{title}</h3>
      <p className="text-[color:var(--parchment-dim)] leading-relaxed">{body}</p>
      <a href={link} className="inline-block mt-5 small-caps text-[11px] text-[color:var(--gold)] hover:text-[color:var(--parchment)]">
        {linkLabel}
      </a>
    </div>
  );
}

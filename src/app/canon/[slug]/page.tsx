import Link from "next/link";
import { notFound } from "next/navigation";
import { BRANCHES, getBranch, REPO_TREE, DRIVE_URL } from "@/lib/canon";

export function generateStaticParams() {
  return BRANCHES.map((b) => ({ slug: b.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const b = getBranch(params.slug);
  if (!b) return { title: "Canon · bucket.foundation" };
  return {
    title: `${b.num} · ${b.name} — canon · bucket.foundation`,
    description: b.thesis,
  };
}

export default function Page({ params }: { params: { slug: string } }) {
  const b = getBranch(params.slug);
  if (!b) notFound();

  const sum =
    b.sources.reduce((m, s) => m + s.count, 0) +
    b.figures.reduce((m, f) => m + f.works, 0);

  return (
    <main className="min-h-screen">
      <header className="border-b hairline">
        <div className="max-w-4xl mx-auto px-4 md:px-6 pt-14 md:pt-24 pb-10 md:pb-16">
          <div className="small-caps text-[11px] text-[color:var(--gold)] mb-6">
            <Link href="/canon" className="hover:text-[color:var(--parchment)]">§ canon</Link>{" "}
            <span className="text-[color:var(--parchment-dim)]">/ {b.num}</span>
          </div>
          <h1 className="font-serif-display text-[clamp(2.5rem,6vw,5rem)] leading-[1.05] text-[color:var(--parchment)]">
            {b.name}
          </h1>
          <p className="mt-6 text-xl text-[color:var(--parchment-dim)] leading-relaxed text-pretty max-w-2xl">
            {b.thesis}
          </p>
          <div className="mt-8 text-sm small-caps text-[color:var(--parchment-dim)]">
            {sum.toLocaleString()} seed artifacts
          </div>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-4 md:px-6 py-10 md:py-10 md:py-16 space-y-8 md:space-y-10 md:space-y-16">
        <div>
          <h2 className="font-serif-display text-3xl text-[color:var(--parchment)] mb-8">Sources</h2>
          <div className="divide-y divide-[color:var(--hairline)]">
            {b.sources.map((s) => (
              <div key={s.label} className="py-5 flex items-start justify-between gap-6">
                <div>
                  <div className="text-[color:var(--parchment)] text-lg">{s.label}</div>
                  {s.note && <div className="text-sm text-[color:var(--parchment-dim)] mt-1">{s.note}</div>}
                </div>
                <div className="font-serif-display text-3xl text-[color:var(--gold)] shrink-0">
                  {s.count.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {b.figures.length > 0 && (
          <div>
            <h2 className="font-serif-display text-3xl text-[color:var(--parchment)] mb-8">Figures</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[color:var(--hairline)]">
              {b.figures.map((f) => (
                <Link
                  key={f.slug}
                  href={`/canon/${b.slug}/figures/${f.slug}`}
                  className="bg-[color:var(--bone-2)] p-6 hover:bg-[color:var(--bone-3)] transition"
                >
                  <div className="font-serif-display text-2xl text-[color:var(--parchment)]">
                    {f.name}
                  </div>
                  <div className="text-sm text-[color:var(--parchment-dim)] mt-1">{f.note}</div>
                  <div className="mt-3 small-caps text-[11px] text-[color:var(--gold)]">
                    {f.works.toLocaleString()} authored works
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="border-t hairline pt-8 flex flex-wrap gap-4 small-caps text-[11px]">
          <a href={`${REPO_TREE}/${b.num}-${b.slug}`} className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]">
            open on github ↗
          </a>
          <a href={DRIVE_URL} className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]">
            bucketdrive ↗
          </a>
          <Link href="/join" className="text-[color:var(--parchment)] hover:text-[color:var(--gold)]">
            contribute canon →
          </Link>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import { BRANCHES, REPO_TREE, DRIVE_URL } from "@/lib/canon";

export const metadata = { title: "Canon · bucket.foundation" };

export default function Page() {
  const totalSources = BRANCHES.reduce((n, b) => n + b.sources.reduce((m, s) => m + s.count, 0), 0);
  const totalFigures = BRANCHES.reduce((n, b) => n + b.figures.length, 0);
  const figureWorks = BRANCHES.reduce(
    (n, b) => n + b.figures.reduce((m, f) => m + f.works, 0), 0
  );

  return (
    <main className="min-h-screen">
      <header className="border-b hairline">
        <div className="max-w-6xl mx-auto px-4 md:px-6 pt-14 md:pt-24 pb-10 md:pb-16">
          <div className="small-caps text-[11px] text-[color:var(--gold)] mb-6">§ canon</div>
          <h1 className="font-serif-display text-[clamp(2.25rem,5vw,4.5rem)] leading-[1.05] text-[color:var(--parchment)]">
            Eight branches.<br />One index.
          </h1>
          <div className="mt-10 grid grid-cols-3 max-w-2xl gap-6">
            <Stat label="branches" value="8" />
            <Stat label="seed artifacts" value={String(totalSources + figureWorks)} />
            <Stat label="canon figures" value={String(totalFigures)} />
          </div>
          <div className="mt-10 flex flex-wrap gap-4 small-caps text-[11px]">
            <a href={REPO_TREE} className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]">bucket-research repo ↗</a>
            <a href={DRIVE_URL} className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]">BucketDrive ↗</a>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 md:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[color:var(--hairline)]">
          {BRANCHES.map((b) => {
            const sum = b.sources.reduce((m, s) => m + s.count, 0) +
                        b.figures.reduce((m, f) => m + f.works, 0);
            return (
              <Link
                key={b.slug}
                href={`/canon/${b.slug}`}
                className="group bg-[color:var(--bone-2)] p-8 hover:bg-[color:var(--bone-3)] transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="font-mono-mark text-xs text-[color:var(--gold-dim)] group-hover:text-[color:var(--gold)]">
                    {b.num}
                  </div>
                  <div className="text-xs text-[color:var(--parchment-dim)] small-caps">
                    {sum.toLocaleString()} artifacts
                  </div>
                </div>
                <div className="font-serif-display text-3xl text-[color:var(--parchment)]">
                  {b.name}
                </div>
                <div className="text-sm text-[color:var(--parchment-dim)] mt-1 mb-4">{b.note}</div>
                <p className="text-[color:var(--parchment-dim)] leading-relaxed text-[15px] text-pretty">
                  {b.thesis}
                </p>
                {b.figures.length > 0 && (
                  <div className="mt-5 pt-4 border-t hairline">
                    <div className="small-caps text-[10px] text-[color:var(--gold)] mb-2">figures</div>
                    <div className="flex flex-wrap gap-2">
                      {b.figures.map((f) => (
                        <span key={f.slug} className="text-xs text-[color:var(--parchment)] border hairline px-2 py-1">
                          {f.name} · {f.works.toLocaleString()} works
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-serif-display text-4xl text-[color:var(--gold)]">{value}</div>
      <div className="small-caps text-[10px] text-[color:var(--parchment-dim)] mt-1">{label}</div>
    </div>
  );
}

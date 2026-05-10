import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllBridges, getBridge } from "@/lib/canon-bridges";

export const dynamic = "force-static";

export function generateStaticParams() {
  return getAllBridges().map((b) => ({ slug: b.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const b = getBridge(params.slug);
  if (!b) return { title: "Bridge · bucket.foundation" };
  return { title: `${b.title} — bridge · bucket.foundation` };
}

export default function Page({ params }: { params: { slug: string } }) {
  const b = getBridge(params.slug);
  if (!b) notFound();

  return (
    <main className="mx-auto max-w-3xl px-5 pb-32 pt-16 md:px-8 md:pt-24">
      <p
        className="mb-3 text-xs uppercase tracking-[0.22em]"
        style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
      >
        <Link href="/canon/bridges" className="hover:text-[color:var(--gold)]">
          ← bridges
        </Link>
      </p>
      <h1
        className="text-[2.4rem] leading-[1.05] md:text-[3.4rem]"
        style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500 }}
      >
        {b.title}
      </h1>
      <p
        className="mt-3 text-lg"
        style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}
      >
        {b.tier} · {b.mass.toLocaleString()} hits · {b.spans} branches
      </p>

      <section className="mt-12">
        <h2
          className="mb-4 text-sm uppercase tracking-[0.2em]"
          style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
        >
          Branches it touches
        </h2>
        <ul className="space-y-3">
          {b.branches.map((br) => (
            <li
              key={br.branch}
              className="border-l-2 border-[color:var(--hairline)] pl-4"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              <span style={{ fontWeight: 500 }}>{br.branch}</span> — {br.description}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2
          className="mb-4 text-sm uppercase tracking-[0.2em]"
          style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
        >
          Primary sources
        </h2>
        <ul className="space-y-2 text-sm" style={{ fontFamily: "var(--font-fraunces)" }}>
          {b.sources.map((s, i) => (
            <li key={i} style={{ color: "var(--parchment-dim)" }}>
              {s}
            </li>
          ))}
        </ul>
      </section>

      {b.notes.length > 0 && (
        <section className="mt-12">
          <h2
            className="mb-4 text-sm uppercase tracking-[0.2em]"
            style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
          >
            Notes / open questions
          </h2>
          <div
            className="space-y-2"
            style={{ fontFamily: "var(--font-fraunces)", color: "var(--parchment-dim)" }}
          >
            {b.notes.map((n, i) => (
              <p key={i}>{n}</p>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

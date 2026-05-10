// /canon/bridges — index of canon bridges (the meta-structure across branches).
import Link from "next/link";
import { getAllBridges } from "@/lib/canon-bridges";

export const metadata = { title: "Canon bridges · bucket.foundation" };
export const dynamic = "force-static";

export default function Page() {
  const bridges = getAllBridges();
  const primary = bridges.filter((b) => b.tier === "primary axis");
  const secondary = bridges.filter((b) => b.tier === "secondary");

  return (
    <main className="mx-auto max-w-5xl px-5 pb-32 pt-16 md:px-8 md:pt-24">
      <header className="mb-12">
        <p
          className="mb-4 text-xs uppercase tracking-[0.22em]"
          style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
        >
          Meta · canon structure
        </p>
        <h1
          className="text-[2.4rem] leading-[1.05] md:text-[3.4rem]"
          style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500 }}
        >
          Bridges
        </h1>
        <p
          className="mt-4 max-w-2xl text-lg md:text-xl"
          style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}
        >
          The seven branches are pedagogical entry-points. The actual structure of
          canon is in the bridges — concepts that span branches with substantial
          mass. <em>Canon is one weave with seven entry points.</em>
        </p>
      </header>

      <section className="mb-16">
        <h2
          className="mb-6 text-sm uppercase tracking-[0.2em]"
          style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
        >
          Primary axes
        </h2>
        <div className="space-y-4">
          {primary.map((b) => (
            <Link
              key={b.slug}
              href={`/canon/bridges/${b.slug}`}
              className="block rounded-md border border-[color:var(--hairline)] p-6 transition hover:border-[color:var(--gold)]"
            >
              <div className="flex items-baseline justify-between">
                <h3
                  className="text-2xl"
                  style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500 }}
                >
                  {b.title}
                </h3>
                <span
                  className="text-xs uppercase tracking-[0.18em]"
                  style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
                >
                  {b.mass.toLocaleString()} hits · {b.spans} branches
                </span>
              </div>
              <p
                className="mt-2 text-sm"
                style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}
              >
                {b.branches.slice(0, 3).map((br) => br.branch).join(" · ")}
                {b.branches.length > 3 && ` …`}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2
          className="mb-6 text-sm uppercase tracking-[0.2em]"
          style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
        >
          Secondary bridges
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {secondary.map((b) => (
            <Link
              key={b.slug}
              href={`/canon/bridges/${b.slug}`}
              className="flex items-baseline justify-between rounded-md border border-[color:var(--hairline)] px-4 py-3 transition hover:border-[color:var(--gold)]"
            >
              <span style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500 }}>
                {b.title}
              </span>
              <span
                className="text-sm"
                style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-jetbrains)" }}
              >
                {b.mass.toLocaleString()}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

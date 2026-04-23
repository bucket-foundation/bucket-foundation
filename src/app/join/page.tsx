import PageShell from "@/components/PageShell";
import Link from "next/link";

export const metadata = { title: "Contribute canon · bucket.foundation" };

export default function Page() {
  return (
    <PageShell
      eyebrow="§ contribute"
      title="The foundation is open."
      subtitle="Three ways in, ranked by the standard we hold for canon."
    >
      <div className="space-y-10">
        <section className="border-l-2 border-[color:var(--gold)] pl-6">
          <div className="small-caps text-[11px] text-[color:var(--gold)] mb-2">i · primary source</div>
          <h2 className="font-serif-display text-2xl text-[color:var(--parchment)] mb-3">
            You wrote it. Mint it.
          </h2>
          <p className="text-[color:var(--parchment-dim)] leading-relaxed">
            Axioms, real math, rules, laws, principles, primary derivations
            — work you authored yourself and that meets the canon standard.
            Mint it as a Story Protocol IP asset, set a citation price, and
            every future citation pays you forever.
          </p>
        </section>

        <section className="border-l-2 border-[color:var(--gold-dim)] pl-6">
          <div className="small-caps text-[11px] text-[color:var(--gold-dim)] mb-2">ii · curation</div>
          <h2 className="font-serif-display text-2xl text-[color:var(--parchment)] mb-3">
            Pull request a canon entry.
          </h2>
          <p className="text-[color:var(--parchment-dim)] leading-relaxed">
            Open a PR on{" "}
            <a href="https://github.com/bucket-foundation/bucket-research" className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]">
              bucket-research
            </a>{" "}
            against the matching branch. Every entry is a{" "}
            <Link href="/protocol" className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]">feed402 §3 envelope</Link>
            {" "}(data + citation + receipt) — no raw scrapes, no commentary,
            no draft notes. Review happens on the PR thread.
          </p>
        </section>

        <section className="border-l-2 border-[color:var(--parchment-dim)] pl-6 opacity-90">
          <div className="small-caps text-[11px] text-[color:var(--parchment-dim)] mb-2">iii · protocol</div>
          <h2 className="font-serif-display text-2xl text-[color:var(--parchment)] mb-3">
            Run a feed402 merchant.
          </h2>
          <p className="text-[color:var(--parchment-dim)] leading-relaxed">
            Put your data behind x402 and expose a manifest at{" "}
            <code className="font-mono-mark text-[color:var(--gold)] text-sm">/.well-known/feed402.json</code>.
            Two reference implementations exist —{" "}
            <a href="https://github.com/gianyrox/feed402" className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]">TS</a>{" "}
            and{" "}
            <a href="https://github.com/gianyrox/x402-research-gateway" className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]">Go</a>.
            The protocol is the supply side bucket is bootstrapping.
          </p>
        </section>

        <div className="pt-8 border-t hairline text-sm text-[color:var(--parchment-dim)]">
          Questions, proposals, high-signal introductions →{" "}
          <a href="mailto:hello@bucket.foundation" className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]">
            hello@bucket.foundation
          </a>
        </div>
      </div>
    </PageShell>
  );
}

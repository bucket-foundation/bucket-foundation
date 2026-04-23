import Link from "next/link";
import Shield from "./Shield";

const BRANCHES = [
  { num: "01", name: "mathematics", note: "axioms, real math" },
  { num: "02", name: "physics",     note: "laws, first principles" },
  { num: "03", name: "chemistry",   note: "periodic · quantum · thermo" },
  { num: "04", name: "information", note: "computation · information" },
  { num: "05", name: "biophysics",  note: "light · water · mitochondria" },
  { num: "06", name: "cosmology",   note: "spacetime · structure" },
  { num: "07", name: "mind",        note: "cognition · consciousness" },
  { num: "08", name: "earth",       note: "geosciences · biosphere" },
];

export default function Presentation() {
  return (
    <main className="min-h-screen">
      {/* ============ HERO ============ */}
      <section className="relative border-b hairline">
        <div className="max-w-6xl mx-auto px-6 pt-28 pb-24 grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
          <div className="md:col-span-8">
            <div className="small-caps text-[11px] text-[color:var(--gold)] mb-8 flex items-center gap-3">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[color:var(--gold)] ember" />
              a nonprofit research foundation · est. 2022
            </div>

            <h1 className="font-serif-display text-[clamp(2.5rem,6vw,5.25rem)] leading-[1.02] text-[color:var(--parchment)]">
              <span className="block">build the past.</span>
              <span className="block">build history.</span>
              <span className="block italic text-[color:var(--gold)]">
                bucket is the new<br />renaissance.
              </span>
            </h1>

            <p className="mt-10 max-w-xl text-lg text-[color:var(--parchment-dim)] leading-relaxed text-pretty">
              Primary research paid for once, citeable forever. A canon of
              foundations — axioms, laws, first principles — built by a small
              number of people doing genius work with AI.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/canon"
                className="px-6 py-3 border border-[color:var(--gold)] text-[color:var(--gold)] hover:bg-[color:var(--gold)] hover:text-[color:var(--ink)] transition small-caps text-[12px]"
              >
                Read the canon
              </Link>
              <Link
                href="/manifesto"
                className="px-6 py-3 border hairline text-[color:var(--parchment)] hover:border-[color:var(--parchment)] transition small-caps text-[12px]"
              >
                Manifesto
              </Link>
              <a
                href="https://github.com/bucket-foundation"
                className="px-6 py-3 text-[color:var(--parchment-dim)] hover:text-[color:var(--parchment)] transition small-caps text-[12px]"
              >
                GitHub ↗
              </a>
            </div>
          </div>

          <div className="md:col-span-4 flex justify-center md:justify-end text-[color:var(--gold)]">
            <Shield size={220} className="opacity-90" />
          </div>
        </div>
      </section>

      {/* ============ THESIS ============ */}
      <section className="border-b hairline">
        <div className="max-w-6xl mx-auto px-6 py-24 grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-4">
            <div className="small-caps text-[11px] text-[color:var(--gold)]">§ i · thesis</div>
          </div>
          <div className="md:col-span-8 space-y-6 text-lg text-[color:var(--parchment-dim)] leading-relaxed">
            <p className="text-[color:var(--parchment)] text-xl">
              AI + foundations + a small number of brilliant humans = the next
              layer of reality.
            </p>
            <p>
              Canon holds <em>only</em> foundations: axioms, real math, rules,
              laws, principles, primary derivations. Outcomes — longevity,
              disease, cognition — are downstream applications, not canon.
            </p>
            <p>
              Every citation pays the author, not the publisher. Every paper is
              free to read and priced-once to cite, over the x402 rail, forever.
            </p>
          </div>
        </div>
      </section>

      {/* ============ BRANCHES ============ */}
      <section className="border-b hairline">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="flex items-end justify-between mb-12">
            <div>
              <div className="small-caps text-[11px] text-[color:var(--gold)] mb-2">§ ii · the canon</div>
              <h2 className="font-serif-display text-4xl md:text-5xl text-[color:var(--parchment)]">
                Eight branches.<br />One index.
              </h2>
            </div>
            <Link href="/canon" className="small-caps text-[12px] text-[color:var(--parchment-dim)] hover:text-[color:var(--gold)]">
              all branches →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--hairline)]">
            {BRANCHES.map((b) => (
              <Link
                key={b.num}
                href={`/canon/${b.name}`}
                className="bg-[color:var(--ink)] p-6 hover:bg-[color:var(--ink-2)] transition group"
              >
                <div className="font-mono-mark text-xs text-[color:var(--gold-dim)] group-hover:text-[color:var(--gold)]">
                  {b.num}
                </div>
                <div className="font-serif-display text-2xl text-[color:var(--parchment)] mt-1">
                  {b.name}
                </div>
                <div className="text-xs text-[color:var(--parchment-dim)] mt-2">
                  {b.note}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PROTOCOL ============ */}
      <section className="border-b hairline">
        <div className="max-w-6xl mx-auto px-6 py-24 grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-4">
            <div className="small-caps text-[11px] text-[color:var(--gold)]">§ iii · protocol</div>
            <h3 className="font-serif-display text-4xl text-[color:var(--parchment)] mt-2">
              feed402
            </h3>
          </div>
          <div className="md:col-span-8 space-y-6 text-lg text-[color:var(--parchment-dim)] leading-relaxed">
            <p>
              An open standard for paid research endpoints over{" "}
              <span className="text-[color:var(--parchment)]">x402</span> on
              Base. Any AI agent with a wallet can discover a data source at{" "}
              <code className="font-mono-mark text-sm text-[color:var(--gold)]">/.well-known/feed402.json</code>,
              pay per query, and receive a citeable envelope —{" "}
              <span className="italic">data + citation + receipt</span>.
            </p>
            <p>
              Three tiers: <span className="text-[color:var(--parchment)]">raw</span>{" "}
              · <span className="text-[color:var(--parchment)]">query</span>{" "}
              · <span className="text-[color:var(--parchment)]">insight</span>.
              Citations are reproducible, not just referenceable — every hit
              carries its model, chunk id, and corpus hash.
            </p>
            <div className="flex flex-wrap gap-6 pt-2 small-caps text-[11px]">
              <a href="https://github.com/gianyrox/feed402" className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]">
                SPEC.md ↗
              </a>
              <a href="https://github.com/gianyrox/x402-research-gateway" className="text-[color:var(--gold)] hover:text-[color:var(--parchment)]">
                reference gateway ↗
              </a>
              <Link href="/protocol" className="text-[color:var(--parchment)]">
                explainer
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ INVITATION ============ */}
      <section>
        <div className="max-w-4xl mx-auto px-6 py-32 text-center">
          <div className="small-caps text-[11px] text-[color:var(--gold)] mb-6">§ iv · the work</div>
          <h3 className="font-serif-display text-3xl md:text-4xl text-[color:var(--parchment)] leading-snug">
            Bucket exists for the small number of people who can take a model
            and an axiom and reach a layer of reality nobody has reached before.
          </h3>
          <p className="mt-8 text-[color:var(--parchment-dim)] text-lg">
            If that is you — the foundation is open.
          </p>
          <div className="mt-12 flex justify-center gap-4">
            <Link
              href="/join"
              className="px-8 py-3 border border-[color:var(--gold)] text-[color:var(--gold)] hover:bg-[color:var(--gold)] hover:text-[color:var(--ink)] transition small-caps text-[12px]"
            >
              Contribute canon
            </Link>
            <a
              href="https://github.com/bucket-foundation/bucket-research"
              className="px-8 py-3 border hairline text-[color:var(--parchment)] hover:border-[color:var(--parchment)] transition small-caps text-[12px]"
            >
              bucket-research ↗
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

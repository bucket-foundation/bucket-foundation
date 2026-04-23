import Link from "next/link";
import InverseOmega from "./InverseOmega";
import Globe from "./Globe";

const BRANCHES = [
  { num: "01", name: "mathematics", note: "axioms · real math" },
  { num: "02", name: "physics",     note: "laws · first principles" },
  { num: "03", name: "chemistry",   note: "periodic · quantum · thermo" },
  { num: "04", name: "information", note: "computation · information" },
  { num: "05", name: "biophysics",  note: "light · water · mitochondria" },
  { num: "06", name: "cosmology",   note: "spacetime · structure" },
  { num: "07", name: "mind",        note: "cognition · consciousness" },
  { num: "08", name: "earth",       note: "geosciences · biosphere" },
];

export default function Presentation() {
  return (
    <main className="min-h-screen bg-[color:var(--midnight)]">
      {/* ======================== HERO ======================== */}
      <section className="relative overflow-hidden border-b hairline">
        {/* Ambient atmosphere behind everything */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 60% at 80% 35%, rgba(42,157,143,0.10) 0%, rgba(13,27,42,0) 60%), radial-gradient(50% 50% at 15% 80%, rgba(201,162,39,0.08) 0%, rgba(13,27,42,0) 55%)",
          }}
        />

        {/* Gilt horizon line */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-[78%] h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(201,162,39,0.35) 50%, transparent 100%)",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-28 grid grid-cols-1 lg:grid-cols-12 gap-14 items-center">
          {/* Left: type */}
          <div className="lg:col-span-7">
            <div className="small-caps text-[10.5px] text-[color:var(--gold)] mb-8 flex items-center gap-3">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[color:var(--gold)] ember" />
              <span>a nonprofit research foundation</span>
              <span className="text-[color:var(--river-stone)]">/</span>
              <span className="font-mono-mark text-[10px] normal-case tracking-[0.12em]">
                est. mmxxii
              </span>
            </div>

            <h1 className="font-serif-display uppercase text-[clamp(2.75rem,7vw,6rem)] leading-[0.95] tracking-[-0.02em] text-[color:var(--morning-fog)]">
              <span className="block">build the past.</span>
              <span className="block">build history.</span>
              <span className="block text-[color:var(--gold)]">
                bucket is the
              </span>
              <span className="block text-[color:var(--gold)] italic">
                new renaissance.
              </span>
            </h1>

            <p className="mt-10 max-w-xl text-[17px] text-[color:var(--river-stone)] leading-[1.65]">
              <span className="text-[color:var(--morning-fog)]">
                Primary research paid-for-once, citeable-forever.
              </span>{" "}
              A canon of foundations — axioms, laws, first principles —
              built by the small number of people who can do genius work with AI.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/canon"
                className="px-6 py-3 bg-[color:var(--gold)] text-[color:var(--midnight)] hover:bg-[color:var(--gold-dawn)] transition small-caps text-[11px]"
              >
                Read the canon
              </Link>
              <Link
                href="/manifesto"
                className="px-6 py-3 border border-[color:var(--morning-fog)]/30 text-[color:var(--morning-fog)] hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] transition small-caps text-[11px]"
              >
                Manifesto
              </Link>
              <Link
                href="/protocol"
                className="px-6 py-3 text-[color:var(--teal)] hover:text-[color:var(--teal-clear)] transition small-caps text-[11px] border border-[color:var(--teal)]/40 hover:border-[color:var(--teal)]"
              >
                feed402 protocol
              </Link>
              <a
                href="https://github.com/bucket-foundation"
                className="px-6 py-3 text-[color:var(--river-stone)] hover:text-[color:var(--morning-fog)] transition small-caps text-[11px]"
              >
                GitHub ↗
              </a>
            </div>

            {/* Signal strip */}
            <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg">
              <Stat num="8" label="canon branches" />
              <Stat num="76" label="seed figures" />
              <Stat num="1,372" label="einstein works indexed" />
            </div>
          </div>

          {/* Right: Globe + Omega */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div className="relative w-[min(520px,100%)] aspect-square">
              {/* Globe rotates behind */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Globe size={520} className="w-full h-full opacity-90" />
              </div>
              {/* Omega sits in front, a vessel catching the globe */}
              <div className="absolute inset-0 flex items-center justify-center">
                <InverseOmega
                  size={240}
                  tone="gold"
                  className="drop-shadow-[0_0_40px_rgba(201,162,39,0.25)]"
                />
              </div>
              {/* Cartouche under the globe */}
              <div className="absolute -bottom-2 inset-x-0 text-center">
                <div className="inline-block small-caps text-[10px] text-[color:var(--gold)] border-t border-[color:var(--gold)]/40 pt-2 px-6 tracking-[0.22em]">
                  Ω · foundations · canon
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================== THESIS ======================== */}
      <section className="border-b hairline">
        <div className="max-w-7xl mx-auto px-6 py-28 grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-4">
            <div className="small-caps text-[10.5px] text-[color:var(--gold)]">§ i · thesis</div>
            <div className="mt-6 font-mono-mark text-[11px] text-[color:var(--river-stone)] leading-relaxed">
              ax·i·om <span className="text-[color:var(--morning-fog)]">/ˈaksēəm/</span>
              <br />
              <span className="italic text-[color:var(--river-stone)]">n.</span> a statement
              accepted as true, upon which further reasoning is built.
            </div>
          </div>
          <div className="md:col-span-8 space-y-7 text-[17px] text-[color:var(--river-stone)] leading-[1.7]">
            <p className="font-serif-display uppercase text-[color:var(--morning-fog)] text-[clamp(1.6rem,3.4vw,2.4rem)] leading-[1.15] tracking-[-0.015em]">
              AI + foundations + a small number of brilliant humans ={" "}
              <span className="text-[color:var(--gold)]">the next layer of reality.</span>
            </p>
            <p>
              Canon holds <em className="text-[color:var(--morning-fog)]">only</em> foundations:
              axioms, real math, rules, laws, principles, primary derivations. Outcomes —
              longevity, disease, cognition — are downstream applications, not canon.
            </p>
            <p>
              Every citation pays the author, not the publisher. Every paper is free to
              read and priced-once to cite, over the{" "}
              <span className="text-[color:var(--teal)]">x402 rail</span>, forever.
            </p>
          </div>
        </div>
      </section>

      {/* ======================== BRANCHES ======================== */}
      <section className="border-b hairline relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-28">
          <div className="flex items-end justify-between mb-14 flex-wrap gap-6">
            <div>
              <div className="small-caps text-[10.5px] text-[color:var(--gold)] mb-3">§ ii · the canon</div>
              <h2 className="font-serif-display uppercase text-[clamp(2rem,5vw,3.75rem)] leading-[1] tracking-[-0.02em] text-[color:var(--morning-fog)]">
                Eight branches.<br />
                <span className="text-[color:var(--gold)]">One index.</span>
              </h2>
            </div>
            <Link
              href="/canon"
              className="small-caps text-[11px] text-[color:var(--river-stone)] hover:text-[color:var(--gold)] transition border-b border-[color:var(--river-stone)] hover:border-[color:var(--gold)] pb-1"
            >
              all branches →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--hairline)]">
            {BRANCHES.map((b) => (
              <Link
                key={b.num}
                href={`/canon/${b.name}`}
                className="bg-[color:var(--midnight)] p-7 hover:bg-[color:var(--driftwood)] transition group relative"
              >
                <div className="flex items-start justify-between">
                  <div className="font-mono-mark text-[11px] text-[color:var(--gold-amber)] group-hover:text-[color:var(--gold)] tracking-wider">
                    {b.num}
                  </div>
                  <span className="text-[color:var(--river-stone)] group-hover:text-[color:var(--gold)] transition text-lg leading-none">
                    →
                  </span>
                </div>
                <div className="font-serif-display uppercase text-xl text-[color:var(--morning-fog)] mt-5 tracking-tight">
                  {b.name}
                </div>
                <div className="text-[12px] text-[color:var(--river-stone)] mt-2 leading-snug">
                  {b.note}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ======================== PROTOCOL ======================== */}
      <section className="border-b hairline bg-[color:var(--driftwood)]">
        <div className="max-w-7xl mx-auto px-6 py-28 grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-4">
            <div className="small-caps text-[10.5px] text-[color:var(--teal)]">§ iii · protocol</div>
            <h3 className="font-serif-display uppercase text-[clamp(2.25rem,5vw,3.5rem)] text-[color:var(--morning-fog)] mt-3 tracking-tight leading-[1]">
              feed402
            </h3>
            <div className="mt-4 font-mono-mark text-[11px] text-[color:var(--teal-clear)]">
              open · MIT · CC0 spec
            </div>
          </div>
          <div className="md:col-span-8 space-y-6 text-[17px] text-[color:var(--river-stone)] leading-[1.7]">
            <p>
              An open standard for paid research endpoints over{" "}
              <span className="text-[color:var(--teal)]">x402</span> on Base. Any AI
              agent with a wallet can discover a data source at{" "}
              <code className="font-mono-mark text-[13px] text-[color:var(--gold)] bg-[color:var(--midnight)] px-2 py-0.5">
                /.well-known/feed402.json
              </code>
              , pay per query, and receive a citeable envelope —{" "}
              <span className="text-[color:var(--morning-fog)]">data + citation + receipt</span>.
            </p>
            <div className="grid grid-cols-3 gap-4 not-prose">
              <Tier name="raw" price="$0.010" note="source rows" />
              <Tier name="query" price="$0.005" note="filtered view" />
              <Tier name="insight" price="$0.002" note="agent synthesis" highlight />
            </div>
            <div className="flex flex-wrap gap-6 pt-4 small-caps text-[10.5px]">
              <a href="https://github.com/gianyrox/feed402" className="text-[color:var(--gold)] hover:text-[color:var(--gold-dawn)]">SPEC.md ↗</a>
              <a href="https://github.com/gianyrox/x402-research-gateway" className="text-[color:var(--gold)] hover:text-[color:var(--gold-dawn)]">reference gateway ↗</a>
              <Link href="/protocol" className="text-[color:var(--morning-fog)] hover:text-[color:var(--gold)]">read the explainer →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ======================== INVITATION ======================== */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(40% 40% at 50% 60%, rgba(201,162,39,0.10) 0%, rgba(13,27,42,0) 70%)",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-6 py-36 text-center">
          <div className="flex justify-center mb-10">
            <InverseOmega size={72} tone="gold" />
          </div>
          <div className="small-caps text-[10.5px] text-[color:var(--gold)] mb-6">§ iv · the work</div>
          <h3 className="font-serif-display uppercase text-[clamp(1.75rem,4vw,2.75rem)] text-[color:var(--morning-fog)] leading-[1.1] tracking-tight text-balance">
            For the small number of people who can take a model and an axiom and{" "}
            <span className="text-[color:var(--gold)]">reach a layer of reality</span>{" "}
            nobody has reached before.
          </h3>
          <p className="mt-8 text-[color:var(--river-stone)] text-lg">
            If that is you — the foundation is open.
          </p>
          <div className="mt-12 flex justify-center gap-3 flex-wrap">
            <Link
              href="/join"
              className="px-8 py-3 bg-[color:var(--gold)] text-[color:var(--midnight)] hover:bg-[color:var(--gold-dawn)] transition small-caps text-[11px]"
            >
              Contribute canon
            </Link>
            <a
              href="https://github.com/bucket-foundation/bucket-research"
              className="px-8 py-3 border border-[color:var(--morning-fog)]/30 text-[color:var(--morning-fog)] hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] transition small-caps text-[11px]"
            >
              bucket-research ↗
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ num, label }: { num: string; label: string }) {
  return (
    <div>
      <div className="font-serif-display text-2xl text-[color:var(--gold)] leading-none">
        {num}
      </div>
      <div className="mt-2 small-caps text-[9.5px] text-[color:var(--river-stone)] leading-tight">
        {label}
      </div>
    </div>
  );
}

function Tier({
  name,
  price,
  note,
  highlight,
}: {
  name: string;
  price: string;
  note: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "p-4 border " +
        (highlight
          ? "border-[color:var(--teal)] bg-[color:var(--midnight)]"
          : "border-[color:var(--hairline)] bg-[color:var(--midnight)]/60")
      }
    >
      <div className="small-caps text-[10px] text-[color:var(--teal-clear)]">{name}</div>
      <div className="font-mono-mark text-[color:var(--gold)] text-lg mt-2">{price}</div>
      <div className="text-[11px] text-[color:var(--river-stone)] mt-1">{note}</div>
    </div>
  );
}

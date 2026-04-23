import Link from "next/link";
import InverseOmega from "./InverseOmega";
import Globe from "./Globe";

const BRANCHES = [
  { num: "I",    slug: "mathematics", name: "mathematics", note: "axioms · real math" },
  { num: "II",   slug: "physics",     name: "physics",     note: "laws · first principles" },
  { num: "III",  slug: "chemistry",   name: "chemistry",   note: "periodic · quantum · thermo" },
  { num: "IV",   slug: "information", name: "information", note: "computation · information" },
  { num: "V",    slug: "biophysics",  name: "biophysics",  note: "light · water · mitochondria" },
  { num: "VI",   slug: "cosmology",   name: "cosmology",   note: "spacetime · structure" },
  { num: "VII",  slug: "mind",        name: "mind",        note: "cognition · consciousness" },
  { num: "VIII", slug: "earth",       name: "earth",       note: "geosciences · biosphere" },
];

export default function Presentation() {
  return (
    <main className="min-h-screen stone-bone">
      {/* ================= HERO — CARVED PLINTH ===================== */}
      <section className="relative overflow-hidden">
        {/* Ambient atmospheric tint */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(55% 60% at 78% 30%, rgba(14,140,140,0.10) 0%, rgba(247,244,236,0) 60%), radial-gradient(40% 40% at 12% 78%, rgba(232,178,58,0.10) 0%, rgba(247,244,236,0) 60%)",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* ——————— Left column: inscriptional type ——————— */}
          <div className="lg:col-span-7">
            <div className="small-caps text-[10px] text-[color:var(--aegean)] mb-8 flex items-center gap-3">
              <span className="inline-block w-[5px] h-[5px] bg-[color:var(--gold)] ember" />
              <span>a nonprofit foundation</span>
              <span className="text-[color:var(--basalt-3)]">·</span>
              <span className="font-mono-mark text-[10px] normal-case tracking-[0.18em]">
                EST · MMXXII
              </span>
            </div>

            <h1 className="font-display uppercase text-[clamp(2.5rem,6.5vw,5.75rem)] leading-[0.92] tracking-[0.005em] chisel">
              <span className="block">build the past.</span>
              <span className="block">build history.</span>
              <span className="block text-[color:var(--aegean-deep)]">bucket is the</span>
              <span className="block text-[color:var(--aegean-deep)]">new renaissance.</span>
            </h1>

            <div className="mt-8 carved-rule max-w-sm" />

            <p className="mt-8 max-w-xl text-[17px] text-[color:var(--basalt-2)] leading-[1.7]">
              <span className="chisel text-[color:var(--basalt)] font-semibold">
                Primary research paid-for-once, citeable-forever.
              </span>{" "}
              A canon of foundations — axioms, laws, first principles — carved
              into stone by the small number of people who can do genius work
              with AI.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/canon"
                className="px-7 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] hover:bg-[color:var(--aegean-deep)] transition small-caps text-[11px] shadow-[inset_0_-2px_0_rgba(0,0,0,0.4),inset_0_1px_0_rgba(247,244,236,0.12)]"
              >
                Read the canon
              </Link>
              <Link
                href="/manifesto"
                className="px-7 py-3 border-2 border-[color:var(--basalt)] text-[color:var(--basalt)] hover:bg-[color:var(--basalt)] hover:text-[color:var(--bone)] transition small-caps text-[11px]"
              >
                Manifesto
              </Link>
              <Link
                href="/protocol"
                className="px-7 py-3 border-2 border-[color:var(--aegean)] text-[color:var(--aegean-deep)] hover:bg-[color:var(--aegean)] hover:text-[color:var(--bone)] transition small-caps text-[11px]"
              >
                feed402
              </Link>
              <a
                href="https://github.com/bucket-foundation"
                className="px-7 py-3 text-[color:var(--basalt-2)] hover:text-[color:var(--aegean)] transition small-caps text-[11px]"
              >
                GitHub ↗
              </a>
            </div>

            {/* Plinth stats — carved numerals */}
            <div className="mt-14 grid grid-cols-3 gap-8 max-w-xl border-t border-[color:var(--hairline)] pt-8">
              <Stat num="VIII" label="canon branches" />
              <Stat num="LXXVI" label="seed figures" />
              <Stat num="1,372" label="einstein works" />
            </div>
          </div>

          {/* ——————— Right column: the omega monolith ——————— */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <OmegaMonolith />
          </div>
        </div>
      </section>

      {/* ================= THESIS — BASALT TABLET ===================== */}
      <section className="stone-basalt border-t-4 border-[color:var(--gold)] relative">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-b from-[color:var(--gold-deep)] to-transparent opacity-50"
        />
        <div className="max-w-7xl mx-auto px-6 py-28 grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-4">
            <div className="small-caps text-[10px] text-[color:var(--gold)]">§ I · Thesis</div>
            <div className="mt-8 font-mono-mark text-[11px] text-[color:var(--bone-3)] leading-relaxed">
              <div className="text-[color:var(--bone)] mb-2">ax·i·om</div>
              <div className="italic text-[color:var(--bone-3)]">n.</div>
              <div className="mt-1">
                a statement accepted as true, upon which further reasoning is
                built — and into which the mason strikes first.
              </div>
            </div>
          </div>
          <div className="md:col-span-8 space-y-8">
            <h2 className="font-display uppercase text-[clamp(1.75rem,3.8vw,2.8rem)] leading-[1.1] chisel-bone">
              AI + foundations + a small number of brilliant humans ={" "}
              <span className="inlay-gold">the next layer of reality.</span>
            </h2>
            <div className="carved-rule-bone max-w-xs" />
            <p className="text-[17px] text-[color:var(--bone-3)] leading-[1.75]">
              Canon holds <em className="text-[color:var(--bone)] not-italic font-semibold">only</em>{" "}
              foundations: axioms, real math, rules, laws, principles, primary
              derivations. Outcomes — longevity, disease, cognition — are
              downstream applications, not canon.
            </p>
            <p className="text-[17px] text-[color:var(--bone-3)] leading-[1.75]">
              Every citation pays the author, not the publisher. Every paper is
              free to read and priced-once to cite, over the{" "}
              <span className="text-[color:var(--gold)]">x402 rail</span>, forever.
            </p>
          </div>
        </div>
      </section>

      {/* ================= BRANCHES — EIGHT PLINTHS ================== */}
      <section className="stone-bone relative border-t-4 border-[color:var(--basalt)]">
        <div className="max-w-7xl mx-auto px-6 py-28">
          <div className="flex items-end justify-between mb-14 flex-wrap gap-6">
            <div>
              <div className="small-caps text-[10px] text-[color:var(--aegean-deep)] mb-3">§ II · The Canon</div>
              <h2 className="font-display uppercase text-[clamp(2rem,5vw,3.75rem)] leading-[1] chisel tracking-[0.01em]">
                Eight branches.<br />
                <span className="text-[color:var(--aegean-deep)]">One index.</span>
              </h2>
            </div>
            <Link
              href="/canon"
              className="small-caps text-[11px] text-[color:var(--basalt-2)] hover:text-[color:var(--aegean)] transition border-b-2 border-[color:var(--basalt)] hover:border-[color:var(--aegean)] pb-1"
            >
              all branches →
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--basalt)]">
            {BRANCHES.map((b) => (
              <Link
                key={b.slug}
                href={`/canon/${b.slug}`}
                className="stone-bone p-8 hover:bg-[color:var(--bone-2)] transition group relative"
              >
                {/* Roman numeral carved */}
                <div className="flex items-start justify-between">
                  <div className="font-display text-[28px] text-[color:var(--basalt-3)] group-hover:text-[color:var(--aegean-deep)] transition leading-none">
                    {b.num}
                  </div>
                  <span className="text-[color:var(--basalt-3)] group-hover:text-[color:var(--aegean)] transition text-lg leading-none">
                    →
                  </span>
                </div>
                <div className="font-display uppercase text-xl text-[color:var(--basalt)] mt-6 tracking-[0.03em]">
                  {b.name}
                </div>
                <div className="mt-3 w-8 h-0.5 bg-[color:var(--gold)] group-hover:w-16 transition-all" />
                <div className="text-[12px] text-[color:var(--basalt-2)] mt-3 leading-snug font-mono-mark">
                  {b.note}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ================= PROTOCOL — TEAL MONOLITH ================== */}
      <section className="stone-aegean relative border-t-4 border-[color:var(--gold)]">
        <div className="max-w-7xl mx-auto px-6 py-28 grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-4">
            <div className="small-caps text-[10px] text-[color:var(--gold)]">§ III · Protocol</div>
            <h3 className="font-display uppercase text-[clamp(2.25rem,5vw,3.5rem)] chisel-bone mt-3 leading-[1] tracking-[0.02em]">
              feed402
            </h3>
            <div className="mt-5 font-mono-mark text-[11px] text-[color:var(--gold)]">
              open · MIT · CC0 spec
            </div>
            <div className="mt-8 carved-rule-bone max-w-[140px]" />
          </div>
          <div className="md:col-span-8 space-y-7 text-[17px] text-[color:var(--bone-3)] leading-[1.75]">
            <p>
              An open standard for paid research endpoints over{" "}
              <span className="text-[color:var(--gold)]">x402</span> on Base. Any
              AI agent with a wallet can discover a data source at{" "}
              <code className="font-mono-mark text-[13px] text-[color:var(--gold)] bg-[color:var(--basalt)] px-2 py-1 border border-[color:var(--gold-deep)]/40">
                /.well-known/feed402.json
              </code>
              , pay per query, and receive a citeable envelope —{" "}
              <span className="text-[color:var(--bone)] font-semibold">data + citation + receipt</span>.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <Tier name="raw" price="$0.010" note="source rows" />
              <Tier name="query" price="$0.005" note="filtered view" />
              <Tier name="insight" price="$0.002" note="agent synthesis" highlight />
            </div>
            <div className="flex flex-wrap gap-6 pt-3 small-caps text-[10.5px]">
              <a href="https://github.com/gianyrox/feed402" className="text-[color:var(--gold)] hover:text-[color:var(--bone)] transition">
                SPEC.md ↗
              </a>
              <a href="https://github.com/gianyrox/x402-research-gateway" className="text-[color:var(--gold)] hover:text-[color:var(--bone)] transition">
                reference gateway ↗
              </a>
              <Link href="/protocol" className="text-[color:var(--bone)] hover:text-[color:var(--gold)] transition">
                read the explainer →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= INVITATION — CARVED VERDICT ============== */}
      <section className="stone-bone relative overflow-hidden border-t-4 border-[color:var(--basalt)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(45% 45% at 50% 55%, rgba(232,178,58,0.14) 0%, rgba(247,244,236,0) 70%)",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-6 py-36 text-center">
          <div className="flex justify-center mb-10">
            <InverseOmega size={84} />
          </div>
          <div className="small-caps text-[10.5px] text-[color:var(--aegean-deep)] mb-6">§ IV · The Work</div>
          <h3 className="font-display uppercase text-[clamp(1.6rem,3.6vw,2.5rem)] leading-[1.15] tracking-[0.01em] chisel text-balance">
            For the small number of people who can take a model and an axiom
            and{" "}
            <span className="text-[color:var(--aegean-deep)]">reach a layer of reality</span>{" "}
            nobody has reached before.
          </h3>
          <div className="mt-10 carved-rule max-w-sm mx-auto" />
          <p className="mt-8 text-[color:var(--basalt-2)] text-lg">
            If that is you — the foundation is open.
          </p>
          <div className="mt-12 flex justify-center gap-3 flex-wrap">
            <Link
              href="/join"
              className="px-8 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] hover:bg-[color:var(--aegean-deep)] transition small-caps text-[11px]"
            >
              Contribute canon
            </Link>
            <a
              href="https://github.com/bucket-foundation/bucket-research"
              className="px-8 py-3 border-2 border-[color:var(--basalt)] text-[color:var(--basalt)] hover:bg-[color:var(--basalt)] hover:text-[color:var(--bone)] transition small-caps text-[11px]"
            >
              bucket-research ↗
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ---------- Monolith: omega + armillary stacked like a cathedral ---- */
function OmegaMonolith() {
  return (
    <div className="relative w-[min(540px,100%)] aspect-[4/5] flex items-end justify-center">
      {/* Pedestal — bone slab with carved rule */}
      <div className="absolute bottom-0 inset-x-8 h-28 stone-bone border-2 border-[color:var(--basalt)] shadow-[inset_0_1px_0_rgba(247,244,236,0.6),inset_0_-6px_20px_rgba(13,13,13,0.15)]">
        <div className="absolute inset-x-4 top-3 carved-rule" />
        <div className="absolute inset-x-4 bottom-3 carved-rule" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display uppercase text-xs tracking-[0.32em] chisel">
            Ω · foundations · canon
          </span>
        </div>
      </div>

      {/* Armillary globe behind */}
      <div className="absolute top-4 inset-x-0 flex items-center justify-center">
        <Globe size={460} className="w-[88%] h-auto opacity-95" mode="basalt" />
      </div>

      {/* Inverse omega in front */}
      <div className="absolute top-[18%] inset-x-0 flex items-center justify-center">
        <InverseOmega
          size={300}
          className="drop-shadow-[0_8px_24px_rgba(13,13,13,0.35)]"
        />
      </div>
    </div>
  );
}

function Stat({ num, label }: { num: string; label: string }) {
  return (
    <div>
      <div className="font-display text-[28px] text-[color:var(--basalt)] leading-none chisel">
        {num}
      </div>
      <div className="mt-3 small-caps text-[9.5px] text-[color:var(--basalt-2)] leading-tight">
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
        "p-4 border-2 bg-[color:var(--basalt)]/70 " +
        (highlight
          ? "border-[color:var(--gold)]"
          : "border-[color:var(--bone)]/20")
      }
    >
      <div className="small-caps text-[10px] text-[color:var(--gold)]">{name}</div>
      <div className="font-mono-mark text-[color:var(--bone)] text-lg mt-2">{price}</div>
      <div className="text-[11px] text-[color:var(--bone-3)] mt-1">{note}</div>
    </div>
  );
}

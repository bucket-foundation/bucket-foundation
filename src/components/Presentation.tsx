import Image from "next/image";
import Link from "next/link";
import Globe from "./Globe";
import InverseOmega from "./InverseOmega";

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

const MARQUEE = [
  "free to read",
  "paid to cite",
  "free to read",
  "paid to cite",
  "free to read",
  "paid to cite",
  "free to read",
  "paid to cite",
];

export default function Presentation() {
  return (
    <main className="min-h-screen stone-bone">
      {/* ════════════════════════════════════════════════════════════ */}
      {/* HERO · the inscription                                        */}
      {/* ════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden grain">
        {/* Ambient patina */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(48% 52% at 78% 30%, rgba(14,140,140,0.12) 0%, rgba(247,244,236,0) 60%), radial-gradient(38% 42% at 12% 80%, rgba(232,178,58,0.10) 0%, rgba(247,244,236,0) 60%)",
          }}
        />

        {/* Inscription marquee — the creed, always moving */}
        <div className="relative border-b-2 border-[color:var(--basalt)] overflow-hidden">
          <div className="stele-track font-display uppercase text-[clamp(1.5rem,3vw,2.25rem)] tracking-[0.2em] py-4 text-[color:var(--basalt)]/75">
            {[...MARQUEE, ...MARQUEE].map((t, i) => (
              <span key={i} className="px-10 inline-flex items-center gap-10">
                <span className="chisel">{t}</span>
                <span className="text-[color:var(--gold)] text-2xl leading-none">◆</span>
              </span>
            ))}
          </div>
        </div>

        <div className="relative max-w-[1400px] mx-auto px-6 pt-14 pb-24 grid grid-cols-12 gap-10 items-start">
          {/* ═══════ Left rail: metadata column (editorial) ═══════ */}
          <aside className="col-span-12 lg:col-span-2 flex lg:flex-col gap-6 lg:gap-10 items-start carve-in-1">
            <div>
              <div className="small-caps text-[10px] text-[color:var(--aegean-deep)]">Folio</div>
              <div className="font-mono-mark text-[11px] mt-1 text-[color:var(--basalt-2)]">
                MMXXII — MMXXVI
              </div>
            </div>
            <div>
              <div className="small-caps text-[10px] text-[color:var(--aegean-deep)]">Imprint</div>
              <div className="font-mono-mark text-[11px] mt-1 text-[color:var(--basalt-2)]">
                bucket.foundation
              </div>
            </div>
            <div>
              <div className="small-caps text-[10px] text-[color:var(--aegean-deep)]">Ledger</div>
              <div className="font-mono-mark text-[11px] mt-1 text-[color:var(--basalt-2)]">
                Base · x402
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="small-caps text-[10px] text-[color:var(--aegean-deep)]">Seal</div>
              <div className="font-mono-mark text-[11px] mt-1 text-[color:var(--laurel)] flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[color:var(--laurel)] ember" />
                verified
              </div>
            </div>
          </aside>

          {/* ═══════ Center: the masthead inscription ═══════ */}
          <div className="col-span-12 lg:col-span-7">
            <div className="carve-in font-mono-mark uppercase text-[10px] tracking-[0.4em] text-[color:var(--basalt-2)] mb-8">
              <span className="text-[color:var(--crimson)]">◆</span>{" "}
              DECENTRALIZED RESEARCH · VOL I · № 01
            </div>

            {/* Hidden H1 for a11y + SEO — the visual hero is the rendered stone panel */}
            <h1 className="sr-only">
              free to read. paid to cite. bucket.foundation — a nonprofit canon of foundations for decentralized research.
            </h1>
            <figure aria-hidden className="carve-in-1 relative border-2 border-[color:var(--basalt)] shadow-[0_50px_80px_-40px_rgba(13,13,13,0.45)]">
              <Image
                src="/brand/tagline-stone.png"
                alt=""
                width={1536}
                height={1024}
                priority
                className="w-full h-auto"
                sizes="(max-width: 1024px) 100vw, 820px"
              />
              {/* Stone plate caption */}
              <figcaption className="absolute -bottom-3 left-4 right-4 bg-[color:var(--basalt)] text-[color:var(--bone)] px-5 py-2 flex items-center justify-between">
                <span className="font-mono-mark text-[10px] tracking-[0.18em] uppercase">
                  Tabula I · the creed
                </span>
                <span className="font-mono-mark text-[10px] text-[color:var(--gold)]">
                  bucket.foundation · MMXXVI
                </span>
              </figcaption>
            </figure>

            <div className="mt-10 carve-in-5 carved-rule max-w-md" />

            <p className="mt-10 carve-in-5 max-w-xl text-[20px] text-[color:var(--basalt-2)] leading-[1.55] drop-cap">
              A nonprofit canon of foundations — axioms, real math, laws,
              principles, primary derivations — carved into stone by the small
              number of people who can do genius work with AI. Every paper is free
              to read. Every citation pays the author, over the x402 rail, forever.
            </p>

            <div className="mt-12 carve-in-6 flex flex-wrap gap-3">
              <Link
                href="/canon"
                className="group relative px-8 py-4 bg-[color:var(--basalt)] text-[color:var(--bone)] hover:bg-[color:var(--aegean-deep)] transition small-caps text-[11px] shadow-[inset_0_-2px_0_rgba(0,0,0,0.4),inset_0_1px_0_rgba(247,244,236,0.12)]"
              >
                <span className="flex items-center gap-3">
                  Read the canon
                  <span className="text-[color:var(--gold)] group-hover:translate-x-1 transition">
                    →
                  </span>
                </span>
              </Link>
              <Link
                href="/protocol"
                className="px-8 py-4 border-2 border-[color:var(--aegean)] text-[color:var(--aegean-deep)] hover:bg-[color:var(--aegean)] hover:text-[color:var(--bone)] transition small-caps text-[11px]"
              >
                feed402 protocol
              </Link>
              <Link
                href="/manifesto"
                className="px-8 py-4 text-[color:var(--basalt)] hover:text-[color:var(--aegean)] transition small-caps text-[11px] border-b-2 border-[color:var(--basalt)] hover:border-[color:var(--aegean)]"
              >
                Manifesto ↗
              </Link>
            </div>
          </div>

          {/* ═══════ Right: the stonepunk omega artifact ═══════ */}
          <div className="col-span-12 lg:col-span-3 relative carve-in-4">
            <figure className="relative aspect-square">
              <div className="absolute inset-0 rounded-sm overflow-hidden shadow-[0_40px_60px_-30px_rgba(13,13,13,0.4)] border-2 border-[color:var(--basalt)]">
                <Image
                  src="/brand/omega-stonepunk.png"
                  alt="Carved stonepunk inverse omega — the bucket.foundation mark"
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 80vw, 320px"
                />
              </div>
              {/* Caption plate */}
              <figcaption className="absolute -bottom-3 left-2 right-2 bg-[color:var(--basalt)] text-[color:var(--bone)] px-4 py-2 flex items-center justify-between">
                <span className="font-mono-mark text-[10px] tracking-[0.15em] uppercase">
                  Ω · plate I
                </span>
                <span className="font-mono-mark text-[10px] text-[color:var(--gold)]">
                  carved · MMXXVI
                </span>
              </figcaption>
            </figure>

            {/* Provenance ledger under the artifact */}
            <dl className="mt-10 space-y-4 font-mono-mark text-[11px]">
              {[
                ["medium", "bone limestone"],
                ["inlay", "basalt + hot gold"],
                ["ledger", "bucket.foundation"],
                ["license", "CC0 intent · MIT code"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 border-b border-[color:var(--hairline)] pb-2">
                  <dt className="small-caps text-[9px] text-[color:var(--aegean-deep)]">{k}</dt>
                  <dd className="text-[color:var(--basalt)]">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Bottom hero stat strip — Roman inscription ledger */}
        <div className="relative border-t-2 border-[color:var(--basalt)]">
          <div className="max-w-[1400px] mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
            <Stat roman="VIII"   label="canon branches"          sub="mathematics → earth" />
            <Stat roman="LXXVI"  label="seed figures"            sub="pass-1 · canon-tier" />
            <Stat roman="MCCCLXXII" label="Einstein works indexed" sub="via OpenAlex" />
            <Stat roman="CDLX"   label="Kruse corpus posts"      sub="05 · biophysics" />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* THESIS · the verdict (basalt tablet)                          */}
      {/* ════════════════════════════════════════════════════════════ */}
      <section className="stone-basalt relative border-t-4 border-[color:var(--gold)] grain">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-b from-[color:var(--gold-deep)] to-transparent opacity-60"
        />
        <div className="max-w-[1400px] mx-auto px-6 py-28 grid grid-cols-12 gap-10">
          <div className="col-span-12 md:col-span-3">
            <div className="small-caps text-[10px] text-[color:var(--gold)]">§ I · Thesis</div>
            <div className="mt-8 font-mono-mark text-[11px] text-[color:var(--bone-3)] leading-[1.8]">
              <div className="text-[color:var(--bone)] mb-2 font-semibold">ax·i·om</div>
              <div className="italic text-[color:var(--bone-3)]">/ˈaksēəm/ · n.</div>
              <div className="mt-2">
                a statement accepted as true, upon which further reasoning is
                built — and into which the mason strikes first.
              </div>
            </div>
          </div>
          <div className="col-span-12 md:col-span-9 space-y-10">
            <h2 className="font-display uppercase text-[clamp(1.9rem,4vw,3.25rem)] leading-[1.08] chisel-bone">
              AI <span className="ed-italic text-[color:var(--bone-3)] font-light">plus</span>{" "}
              foundations <span className="ed-italic text-[color:var(--bone-3)] font-light">plus</span>{" "}
              a small number of brilliant humans{" "}
              <span className="inlay-gold">= the next layer of reality.</span>
            </h2>
            <div className="carved-rule-bone max-w-xs" />
            <div className="grid md:grid-cols-2 gap-10 text-[17px] text-[color:var(--bone-3)] leading-[1.75]">
              <p>
                Canon holds{" "}
                <em className="text-[color:var(--bone)] not-italic font-semibold">only</em>{" "}
                foundations: axioms, real math, rules, laws, principles, primary
                derivations. Outcomes — longevity, disease, cognition — are
                downstream applications, not canon.
              </p>
              <p>
                Every citation pays the <span className="text-[color:var(--gold)]">author</span>,
                not the publisher. Every paper is free to read and priced-once to
                cite, over the <span className="text-[color:var(--gold)]">x402 rail</span>,
                forever.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* MANIFESTO PULL · carved directly into the same stone          */}
      {/* ════════════════════════════════════════════════════════════ */}
      <section className="relative carved-seam py-28">
        <div className="max-w-4xl mx-auto px-6">
          <div className="carved-inset carved-inset-deep carved-pad">
            <div className="small-caps text-[10px] text-[color:var(--aegean-deep)] chisel mb-8">
              § I·b · Manifesto pull
            </div>
            <p className="drop-cap font-serif-display text-[clamp(1.45rem,2.7vw,2.2rem)] leading-[1.35] chisel">
              Primary research is paid for <em className="ed-italic">once</em>, and
              citeable <em className="ed-italic">forever.</em> The author is the
              beneficiary. The publisher is{" "}
              <span className="text-[color:var(--crimson)]">removed from the rail.</span>{" "}
              The citation becomes a payment; the payment becomes provenance;
              provenance becomes canon.
            </p>
            <div className="carved-rule my-10 max-w-sm mx-auto" />
            <p className="ed-italic text-center text-[color:var(--stone-300)] text-[15px] tracking-wide">
              free to read · paid to cite · written in stone
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* CANON · the eight plinths                                     */}
      {/* ════════════════════════════════════════════════════════════ */}
      <section className="stone-bone relative border-t-4 border-[color:var(--basalt)] grain">
        <div className="max-w-[1400px] mx-auto px-6 py-28">
          <div className="grid grid-cols-12 gap-10 items-end mb-16">
            <div className="col-span-12 md:col-span-8">
              <div className="small-caps text-[10px] text-[color:var(--aegean-deep)] mb-4">§ II · The Canon</div>
              <h2 className="font-display uppercase text-[clamp(2.25rem,6vw,4.75rem)] leading-[0.95] chisel tracking-[0.005em]">
                eight branches.<br />
                <span className="ed-italic text-[color:var(--aegean-deep)] font-normal lowercase">one</span>{" "}
                <span className="text-[color:var(--aegean-deep)]">index.</span>
              </h2>
            </div>
            <div className="col-span-12 md:col-span-4 space-y-5 text-[15px] text-[color:var(--basalt-2)] leading-[1.7]">
              <p>
                Each branch is a plinth. Each plinth holds axioms, not outcomes.
                Each axiom is citeable over x402, forever.
              </p>
              <Link
                href="/canon"
                className="inline-flex items-center gap-2 small-caps text-[11px] text-[color:var(--basalt)] hover:text-[color:var(--aegean)] transition border-b-2 border-[color:var(--basalt)] hover:border-[color:var(--aegean)] pb-1"
              >
                all branches
                <span>→</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--basalt)]">
            {BRANCHES.map((b, i) => (
              <Link
                key={b.slug}
                href={`/canon/${b.slug}`}
                className="stone-bone p-8 hover:bg-[color:var(--bone-2)] transition group relative aspect-[4/5] flex flex-col"
              >
                <div className="flex items-start justify-between">
                  <div className="font-display text-[32px] text-[color:var(--basalt-3)] group-hover:text-[color:var(--aegean-deep)] transition leading-none">
                    {b.num}
                  </div>
                  <span className="text-[color:var(--basalt-3)] group-hover:text-[color:var(--gold)] transition text-lg leading-none">
                    →
                  </span>
                </div>
                <div className="mt-auto">
                  <div className="w-8 h-0.5 bg-[color:var(--gold)] group-hover:w-24 transition-all duration-500 mb-4" />
                  <div className="font-display uppercase text-[22px] text-[color:var(--basalt)] tracking-[0.02em] leading-[1.05]">
                    {b.name}
                  </div>
                  <div className="text-[12px] text-[color:var(--basalt-2)] mt-2 leading-snug font-mono-mark">
                    {b.note}
                  </div>
                </div>
                {/* Corner notch — mason's mark */}
                <span
                  aria-hidden
                  className="absolute bottom-0 right-0 w-0 h-0 border-[10px] border-transparent border-b-[color:var(--gold)]/30 border-r-[color:var(--gold)]/30"
                  style={{ transform: `rotate(${i * 12}deg)` }}
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* PROTOCOL · the teal monolith (feed402)                        */}
      {/* ════════════════════════════════════════════════════════════ */}
      <section className="stone-aegean relative border-t-4 border-[color:var(--gold)] overflow-hidden grain-bone">
        {/* Armillary watermark in the background */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 top-1/2 -translate-y-1/2 opacity-30"
        >
          <Globe size={720} mode="basalt" />
        </div>

        <div className="relative max-w-[1400px] mx-auto px-6 py-28 grid grid-cols-12 gap-10">
          <div className="col-span-12 md:col-span-4">
            <div className="small-caps text-[10px] text-[color:var(--gold)]">§ III · Protocol</div>
            <h3 className="font-display uppercase text-[clamp(2.75rem,6vw,4.5rem)] chisel-bone mt-4 leading-[0.92] tracking-[0.02em]">
              feed<span className="text-[color:var(--gold)]">402</span>
            </h3>
            <div className="mt-6 font-mono-mark text-[11px] text-[color:var(--gold)] tracking-wider">
              open · MIT · CC0 spec
            </div>
            <div className="mt-8 carved-rule-bone max-w-[160px]" />
            <p className="mt-8 font-mono-mark text-[12px] text-[color:var(--bone-3)] leading-[1.8]">
              ∂ discover at{" "}
              <span className="text-[color:var(--gold)]">/.well-known/feed402.json</span>
            </p>
          </div>
          <div className="col-span-12 md:col-span-8 space-y-8">
            <p className="text-[20px] text-[color:var(--bone)] leading-[1.6] ed-italic font-light">
              &ldquo;An AI agent with a wallet discovers a data source,
              pays per query, and receives a citeable envelope —{" "}
              <span className="text-[color:var(--gold)] not-italic font-normal">
                data · citation · receipt.
              </span>
              &rdquo;
            </p>
            <div className="grid grid-cols-3 gap-4">
              <Tier name="raw"     price="$0.010" note="source rows" />
              <Tier name="query"   price="$0.005" note="filtered view" />
              <Tier name="insight" price="$0.002" note="agent synthesis" highlight />
            </div>
            <div className="flex flex-wrap gap-6 pt-4 small-caps text-[10.5px]">
              <a
                href="https://github.com/gianyrox/feed402"
                className="text-[color:var(--gold)] hover:text-[color:var(--bone)] transition border-b-2 border-[color:var(--gold)]/40 hover:border-[color:var(--bone)] pb-1"
              >
                SPEC.md ↗
              </a>
              <a
                href="https://github.com/gianyrox/x402-research-gateway"
                className="text-[color:var(--gold)] hover:text-[color:var(--bone)] transition border-b-2 border-[color:var(--gold)]/40 hover:border-[color:var(--bone)] pb-1"
              >
                reference gateway ↗
              </a>
              <Link
                href="/protocol"
                className="text-[color:var(--bone)] hover:text-[color:var(--gold)] transition border-b-2 border-[color:var(--bone)]/40 hover:border-[color:var(--gold)] pb-1"
              >
                read the explainer →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* INSCRIPTION · how a citation works (3-step carve)             */}
      {/* ════════════════════════════════════════════════════════════ */}
      <section className="stone-bone border-t-4 border-[color:var(--basalt)] relative grain">
        <div className="max-w-[1400px] mx-auto px-6 py-28">
          <div className="small-caps text-[10px] text-[color:var(--aegean-deep)] mb-6">§ IV · The Cut</div>
          <h3 className="font-display uppercase text-[clamp(2rem,4.5vw,3.5rem)] chisel mb-16 leading-[1] max-w-4xl">
            how a citation gets{" "}
            <span className="ed-italic text-[color:var(--aegean-deep)] font-normal lowercase">carved</span>.
          </h3>
          <ol className="grid md:grid-cols-3 gap-px bg-[color:var(--basalt)]">
            {[
              {
                num: "I",
                title: "discover",
                body: "Any agent GETs /.well-known/feed402.json. It returns the endpoint list, tiered pricing, wallet address, and corpus hash.",
              },
              {
                num: "II",
                title: "pay",
                body: "Agent signs an EIP-3009 transferWithAuthorization on Base. x402 settles in sub-second finality. Receipt hashes into the envelope.",
              },
              {
                num: "III",
                title: "cite",
                body: "Agent receives { data, citation, receipt }. Citation includes the author DID, corpus hash, model id, chunk id — reproducible forever.",
              },
            ].map((s) => (
              <li key={s.num} className="stone-bone p-10 flex flex-col gap-5">
                <div className="font-display text-[52px] text-[color:var(--gold-deep)] leading-none">
                  {s.num}
                </div>
                <div className="font-display uppercase text-2xl text-[color:var(--basalt)] tracking-[0.02em]">
                  {s.title}
                </div>
                <p className="text-[15px] text-[color:var(--basalt-2)] leading-[1.7]">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* CLOSER · the verdict (bone)                                  */}
      {/* ════════════════════════════════════════════════════════════ */}
      <section className="stone-bone relative overflow-hidden border-t-4 border-[color:var(--basalt)] grain">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(40% 45% at 50% 55%, rgba(232,178,58,0.18) 0%, rgba(247,244,236,0) 70%)",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-6 py-40 text-center">
          <div className="flex justify-center mb-10">
            <InverseOmega size={92} />
          </div>
          <div className="small-caps text-[10.5px] text-[color:var(--aegean-deep)] mb-6">§ V · The Work</div>
          <h3 className="font-display uppercase text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.15] tracking-[0.005em] chisel text-balance">
            for the small number of people who can take a model and an axiom
            and{" "}
            <span className="ed-italic text-[color:var(--aegean-deep)] font-normal lowercase">
              reach a layer of reality
            </span>{" "}
            nobody has reached before.
          </h3>
          <div className="mt-10 carved-rule max-w-sm mx-auto" />
          <p className="mt-8 text-[color:var(--basalt-2)] text-[19px]">
            If that is you — the foundation is open.
          </p>
          <div className="mt-14 flex justify-center gap-3 flex-wrap">
            <Link
              href="/join"
              className="px-10 py-4 bg-[color:var(--basalt)] text-[color:var(--bone)] hover:bg-[color:var(--aegean-deep)] transition small-caps text-[11px]"
            >
              Contribute canon
            </Link>
            <a
              href="https://github.com/bucket-foundation/bucket-research"
              className="px-10 py-4 border-2 border-[color:var(--basalt)] text-[color:var(--basalt)] hover:bg-[color:var(--basalt)] hover:text-[color:var(--bone)] transition small-caps text-[11px]"
            >
              bucket-research ↗
            </a>
          </div>
        </div>
        {/* Closing stele marquee */}
        <div className="border-t-2 border-[color:var(--basalt)] overflow-hidden bg-[color:var(--basalt)]">
          <div className="stele-track font-display uppercase text-[clamp(1.25rem,2.4vw,1.875rem)] tracking-[0.2em] py-4 text-[color:var(--gold)]">
            {[...MARQUEE, ...MARQUEE].map((t, i) => (
              <span key={i} className="px-10 inline-flex items-center gap-10">
                <span>{t}</span>
                <span className="text-[color:var(--bone)] text-xl leading-none">◆</span>
              </span>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

/* ───────────── helpers ───────────── */

function Stat({ roman, label, sub }: { roman: string; label: string; sub: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="font-display text-[clamp(1.75rem,3vw,2.5rem)] chisel leading-none text-[color:var(--basalt)]">
        {roman}
      </div>
      <div className="small-caps text-[10px] text-[color:var(--aegean-deep)] leading-tight">
        {label}
      </div>
      <div className="font-mono-mark text-[11px] text-[color:var(--basalt-2)]">{sub}</div>
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
        "p-5 border-2 bg-[color:var(--basalt)]/60 backdrop-blur-sm " +
        (highlight ? "border-[color:var(--gold)]" : "border-[color:var(--bone)]/25")
      }
    >
      <div className="small-caps text-[10px] text-[color:var(--gold)]">{name}</div>
      <div className="font-mono-mark text-[color:var(--bone)] text-lg mt-2">{price}</div>
      <div className="text-[11px] text-[color:var(--bone-3)] mt-1">{note}</div>
    </div>
  );
}

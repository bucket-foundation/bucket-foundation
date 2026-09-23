import type { Metadata } from "next";
import Link from "next/link";
import { configured, graphService } from "@/lib/research-os/db";
import { loadPrimesReport, type PrimeAlgebraReport, type PrimesReport, type ReportRef } from "@/lib/research-os/primes-report";

export const metadata: Metadata = { title: "Primes", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const LABEL = "small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]";
const H1 = "font-display uppercase text-[clamp(1.5rem,4vw,2rem)] leading-[1.1] chisel text-[color:var(--basalt)]";

function NodeLink({ r }: { r: ReportRef }) {
  const text = (
    <>
      {r.title}
      <span className="ml-2 text-[12px] text-[color:var(--basalt-3)]">{[r.kind, r.branch].filter(Boolean).join(" · ")}</span>
    </>
  );
  return r.slug ? (
    <Link href={`/research-os/n/${encodeURIComponent(r.slug)}`} className="hover:underline underline-offset-4">
      {text}
    </Link>
  ) : (
    <span>{text}</span>
  );
}

function Tile({ n, label }: { n: number; label: string }) {
  return (
    <div className="border border-[color:var(--hairline)] px-3 py-2">
      <div className="font-display text-[24px] leading-none text-[color:var(--basalt)]">{n.toLocaleString("en-US")}</div>
      <div className="mt-1 text-[11px] text-[color:var(--basalt-3)]">{label}</div>
    </div>
  );
}

function Ranked<T extends ReportRef>({ title, hint, rows, figure }: { title: string; hint: string; rows: T[]; figure: (r: T) => string }) {
  return (
    <section className="mt-8">
      <h2 className={LABEL}>{title}</h2>
      <p className="mt-1 text-[12px] text-[color:var(--basalt-3)] max-w-[70ch]">{hint}</p>
      {rows.length === 0 ? (
        <p className="mt-2 text-[13px] text-[color:var(--basalt-2)]">None yet.</p>
      ) : (
        <ol className="mt-2 border-t border-[color:var(--hairline)]">
          {rows.map((r, i) => (
            <li key={`${r.slug ?? r.title}-${i}`} className="border-b border-[color:var(--hairline)] py-2 flex flex-wrap items-baseline gap-x-4 text-[13px] text-[color:var(--basalt)]">
              <span className="text-[12px] text-[color:var(--basalt-3)] w-full md:w-[190px] shrink-0">{figure(r)}</span>
              <span className="flex-1 min-w-[200px]">
                <NodeLink r={r} />
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Listed({ title, hint, children, empty }: { title: string; hint: React.ReactNode; children: React.ReactNode[]; empty?: boolean }) {
  return (
    <section className="mt-8">
      <h2 className={LABEL}>{title}</h2>
      <p className="mt-1 text-[12px] text-[color:var(--basalt-3)] max-w-[70ch]">{hint}</p>
      {empty || children.length === 0 ? (
        <p className="mt-2 text-[13px] text-[color:var(--basalt-2)]">None yet.</p>
      ) : (
        <ol className="mt-2 border-t border-[color:var(--hairline)]">{children}</ol>
      )}
    </section>
  );
}

function Row({ figure, children }: { figure: string; children: React.ReactNode }) {
  return (
    <li className="border-b border-[color:var(--hairline)] py-2 flex flex-wrap items-baseline gap-x-4 text-[13px] text-[color:var(--basalt)]">
      <span className="text-[12px] text-[color:var(--basalt-3)] w-full md:w-[190px] shrink-0 tabular-nums">{figure}</span>
      <span className="flex-1 min-w-[200px]">{children}</span>
    </li>
  );
}

function Joined({ refs, sep }: { refs: ReportRef[]; sep: string }) {
  return (
    <>
      {refs.map((r, i) => (
        <span key={`${r.slug ?? r.title}-${i}`}>
          {i > 0 && <span className="text-[color:var(--basalt-3)]">{sep}</span>}
          <NodeLink r={r} />
        </span>
      ))}
    </>
  );
}

function Algebra({ a }: { a: PrimeAlgebraReport }) {
  const f = a.frontier;
  const maxCount = Math.max(1, ...a.reach.flatMap((r) => r.coefficients));
  return (
    <>
      <section className="mt-8">
        <h2 className={LABEL}>coverage</h2>
        <p className="mt-1 text-[12px] text-[color:var(--basalt-3)] max-w-[70ch]">
          The share of possible prime combinations the graph has built, from 0 to 1. Each combination counts less the more primes it holds and the rarer they are; at s = 2 that discount is steeper, so combinations of a few common primes dominate.
        </p>
        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
          {a.coverage.map((c) => (
            <div key={c.s} className="border border-[color:var(--hairline)] px-3 py-2">
              <div className="font-display text-[24px] leading-none text-[color:var(--basalt)] tabular-nums">{c.coverage.toFixed(3)}</div>
              <div className="mt-1 text-[11px] text-[color:var(--basalt-3)]">at s = {c.s}</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-[color:var(--basalt-3)]">{a.coverage[0]?.supports ?? 0} distinct combinations of primes built so far.</p>
      </section>

      <Listed
        title="unexplored combinations"
        hint={`Sets of primes no composite combines, though every smaller part of the set is combined somewhere: ${f.pairs} pairs and ${f.triples} triples. Chance predicts at least one composite for ${f.expectedAtLeastOne} of them. Ranked by the count chance predicts. ${f.withinBranch} lie inside one branch.`}
      >
        {f.top.map((x, i) => (
          <Row key={i} figure={`expected ${x.expected.toFixed(1)}, seen 0`}>
            <Joined refs={x.primes} sep=" + " />
          </Row>
        ))}
      </Listed>
      {f.topWithinBranch.length > 0 && (
        <div className="mt-3">
          <p className="text-[12px] text-[color:var(--basalt-3)]">Inside one branch:</p>
          <ol className="mt-1 border-t border-[color:var(--hairline)]">
            {f.topWithinBranch.map((x, i) => (
              <Row key={i} figure={`expected ${x.expected.toFixed(1)}, seen 0`}>
                <Joined refs={x.primes} sep=" + " />
              </Row>
            ))}
          </ol>
        </div>
      )}

      <Listed title="primes that travel together" hint="Prime pairs found together more often than chance predicts, by pointwise mutual information over composites, among pairs sharing at least 3.">
        {a.together.map((x, i) => (
          <Row key={i} figure={`PMI ${x.pmi.toFixed(2)}, together in ${x.joint}`}>
            <Joined refs={[x.a, x.b]} sep=" and " />
          </Row>
        ))}
      </Listed>

      <Listed title="implied factors" hint="Every composite that holds the first prime also holds the second, over at least 3 composites. Each is a candidate for the decompose-further queue, which a reviewer reads in either direction. Shown here only; nothing is written to the graph.">
        {a.implied.map((x, i) => (
          <Row key={i} figure={`${x.support} of ${x.support} composites`}>
            <Joined refs={[x.node, x.factor]} sep={x.mutual ? " always with " : " may rest on "} />
          </Row>
        ))}
      </Listed>

      <Listed title="reach" hint="For each prime, the composites that hold it at each depth, depth 1 first: the coefficients of its depth polynomial. The sum is its penetration, and the mean is how far up its reach runs.">
        {a.reach.map((r, i) => (
          <Row key={i} figure={`mean depth ${r.meanDepth.toFixed(1)}`}>
            <NodeLink r={r} />
            <span className="mt-1 flex flex-wrap gap-[2px]" aria-label={`composites per depth: ${r.coefficients.slice(1).join(", ")}`}>
              {r.coefficients.slice(1).map((n, d) => (
                <span
                  key={d}
                  title={`depth ${d + 1}: ${n}`}
                  className="w-[22px] text-center text-[10.5px] tabular-nums leading-[18px] border border-[color:var(--hairline)]"
                  style={{ background: n ? `color-mix(in srgb, var(--gold) ${Math.round(15 + (n / maxCount) * 70)}%, transparent)` : undefined }}
                >
                  {n}
                </span>
              ))}
            </span>
          </Row>
        ))}
      </Listed>
    </>
  );
}

function Report({ r }: { r: PrimesReport }) {
  const s = r.summary;
  const maxTier = Math.max(1, ...s.tiers);
  return (
    <>
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-2">
        <Tile n={s.nodes} label="public nodes" />
        <Tile n={s.prime} label="primes: factors, none of their own" />
        <Tile n={s.composite} label="composites: rest on primes" />
        <Tile n={s.unfactored} label="unfactored: no factor edges yet" />
      </div>
      <p className="mt-3 text-[12px] text-[color:var(--basalt-3)]">
        Deepest chain {s.maxDepth} steps. {s.inCycle > 0 ? `${s.inCycle} nodes sit in a dependency cycle.` : "No dependency cycles."}
      </p>

      <section className="mt-8">
        <h2 className={LABEL}>nodes per tier</h2>
        <p className="mt-1 text-[12px] text-[color:var(--basalt-3)]">Primes sit at tier 0, and each tier up combines lower ones.</p>
        <ul className="mt-2 space-y-1">
          {s.tiers.map((n, tier) => (
            <li key={tier} className="flex items-center gap-3 text-[12px] text-[color:var(--basalt-2)]">
              <span className="w-[52px] shrink-0">tier {tier}</span>
              <span className="h-[10px] bg-[color:var(--gold)]" style={{ width: `${Math.max(2, (n / maxTier) * 70)}%` }} aria-hidden />
              <span>{n}</span>
            </li>
          ))}
        </ul>
      </section>

      <Ranked
        title="most penetrating primes"
        hint="The primes the most composites rest on, with how many branches those composites span and how evenly (spread, 0 to 1)."
        rows={r.penetrating}
        figure={(p) => `${p.composites} in ${p.branches} ${p.branches === 1 ? "branch" : `branches, spread ${p.spread.toFixed(2)}`}`}
      />
      <Ranked title="deepest composites" hint="The longest chains of factors down to a prime, with the distinct primes each rests on." rows={r.deepest} figure={(d) => `depth ${d.depth}, ${d.primes} ${d.primes === 1 ? "prime" : "primes"}`} />
      <Ranked title="widest composites" hint="The composites that rest on the most distinct primes." rows={r.widest} figure={(d) => `${d.primes} primes, depth ${d.depth}`} />


      <section className="mt-8">
        <h2 className={LABEL}>unfactored by kind</h2>
        <p className="mt-1 text-[12px] text-[color:var(--basalt-3)]">Nodes with no factor edges. The ideas among them wait in the decompose-further queue; source excerpts never enter it.</p>
        <ul className="mt-2 flex flex-wrap gap-2 text-[12px] text-[color:var(--basalt-2)]">
          {r.unfactoredByKind.map((u) => (
            <li key={u.kind} className="border border-[color:var(--hairline)] px-2 py-1">
              {u.kind} {u.count}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className={LABEL}>confirmed irreducible</h2>
        <p className="mt-1 text-[13px] text-[color:var(--basalt-2)]">
          A reviewer confirmed {r.confirmedIrreducible.count} of {r.confirmedIrreducible.of} primes as irreducible.
          {r.reviewAgain.length > 0 ? ` ${r.reviewAgain.length} confirmed nodes have gained factors since and need a second look.` : ""}
        </p>
        {r.reviewAgain.length > 0 && (
          <ul className="mt-2 text-[13px] space-y-1">
            {r.reviewAgain.map((n, i) => (
              <li key={`${n.slug}-${i}`}>
                <NodeLink r={n} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Algebra a={r.algebra} />
    </>
  );
}

/**
 * The prime report (ros-prime 1, scripts/research-os/primes-report.ts) where
 * people work: what the graph's public nodes rest on, computed on each load.
 * A deployment with no graph and a read that failed this minute say
 * different things, and neither reads as an empty graph.
 */
export default async function PrimesPage() {
  let report: PrimesReport | null = null;
  let failed = false;
  if (configured()) {
    try {
      report = await loadPrimesReport(graphService());
    } catch (err) {
      console.error("[primes] report failed:", err instanceof Error ? err.message : err);
      failed = true;
    }
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-10 max-w-[900px]">
      <h1 className={H1}>Primes</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[color:var(--basalt-2)] max-w-[70ch]">
        What the graph rests on. A prime is a node with no factors of its own; a composite rests on primes through its prerequisite and derivation edges. Each node page shows its own makeup.
      </p>
      {!configured() ? (
        <p className="mt-6 text-[13px] text-[color:var(--basalt-2)]">This deployment has no graph connected, so there is nothing to decompose here.</p>
      ) : failed || !report ? (
        <p role="alert" className="mt-6 text-[13px] text-[color:var(--gold-deep)]">
          The graph did not answer this minute, so the report was not computed.{" "}
          <Link href="/research-os/primes" className="underline underline-offset-4">
            Try again
          </Link>
          .
        </p>
      ) : (
        <Report r={report} />
      )}
    </div>
  );
}

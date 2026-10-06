import type { ReactNode } from "react";
import { PageHeader, Panel } from "@/components/ui";
import type { Stratum } from "@/lib/research-os/solvability-backtest";
import { REACH_CLASSES, type Prediction } from "@/lib/research-os/solvability-predictions";
import { boundSentence, cutoffSummary, f3, ledeCodings, methodParagraphs, n, pct, verdict, weakParagraphs, type ReportData } from "@/lib/research-os/solvability-frontier-report-copy";

const TH = "text-left small-caps text-[10px] tracking-[0.16em] text-[color:var(--basalt-3)] font-normal px-2 py-1 border-b border-[color:var(--hairline)]";
const TD = "px-2 py-1 align-top text-[12px] text-[color:var(--basalt)] border-b border-[color:var(--hairline)]";
const NUM = `${TD} font-mono tabular-nums text-right`;
const P = "text-[13px] leading-[1.7] text-[color:var(--basalt-2)]";

function Table({ head, children }: { head: readonly string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className={TH}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function StratumRows({ rows }: { rows: readonly Stratum[] }) {
  return (
    <>
      {rows.map((s) => (
        <tr key={s.name}>
          <td className={TD}>{s.name}</td>
          <td className={NUM}>{n(s.inside)}</td>
          <td className={NUM}>{n(s.outside)}</td>
          <td className={NUM}>{s.belowFloor ? "under 10" : pct(s.rateInside)}</td>
          <td className={NUM}>{s.belowFloor ? "under 10" : pct(s.rateOutside)}</td>
          <td className={NUM}>{s.belowFloor ? "" : f3(s.ratio)}</td>
          <td className={NUM}>{s.belowFloor ? "" : f3(s.pValue)}</td>
        </tr>
      ))}
    </>
  );
}

const STRATUM_HEAD = ["stratum", "inside", "outside", "resolved inside", "resolved outside", "ratio", "p"] as const;
const PREDICTION_HEAD = ["problem", "branch", "status", "reach", "growth", "nearest solved", "starting works"] as const;

function PredictionRows({ rows }: { rows: readonly Prediction[] }) {
  return (
    <>
      {rows.map((r) => (
        <tr key={r.id}>
          <td className={TD}>
            <span className="font-display text-[13px]">{r.title}</span>
            <span className="block font-mono text-[10px] text-[color:var(--basalt-3)]">{r.id}</span>
          </td>
          <td className={TD}>{r.branch}</td>
          <td className={TD}>{r.status}</td>
          <td className={NUM}>{f3(r.reach)}</td>
          <td className={NUM}>{r.growth}</td>
          <td className={TD}>
            {r.nearest.map((s) => (
              <span key={s.id} className="block">
                {s.title} <span className="font-mono text-[10px] text-[color:var(--basalt-3)]">{f3(s.similarity)}</span>
              </span>
            ))}
          </td>
          <td className={TD}>
            {r.works.length === 0
              ? <span className="text-[color:var(--basalt-3)]">no record</span>
              : r.works.map((w) => (
                  <span key={w.title} className="block">
                    {w.doi ? (
                      <a href={w.doi} target="_blank" rel="noreferrer" className="underline underline-offset-4 text-[color:var(--aegean-deep)]">
                        {w.title}
                      </a>
                    ) : (
                      w.title
                    )}
                    {w.year ? ` (${w.year})` : ""}
                  </span>
                ))}
          </td>
        </tr>
      ))}
    </>
  );
}

export default function SolvabilityFrontierReport({ data, svg }: { data: ReportData; svg: string }) {
  const branches = Object.entries(data.frontier.branches).sort((a, b) => b[1].total - a[1].total);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Research OS · solvability"
        title="solvability frontier report"
        lede={`${n(data.nodes)} problems, ${n(data.frontier.counts.solved)} solved, frontier at reach ${f3(data.frontier.threshold)}. Which open problems sit close to solved ones, how the rule fared on the questions of ${data.backtest.cutoffs.map((c) => c.cutoff).join(" and ")}, and where the method is weak. ${ledeCodings(data)} Built ${data.built}.`}
      />
      <p className={P}>{verdict(data)}</p>

      <Panel title="frontier">
        <div className="w-full overflow-hidden [&>svg]:w-full [&>svg]:h-auto" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className={`${P} mt-3`}>{data.frontier.rule}</p>
        <p className={P}>{data.frontier.gaps}</p>
      </Panel>

      <Panel title="per branch">
        <Table head={["branch", "total", "solved", "reachable", "beyond", "unsampled", "inside", "outside"]}>
          {branches.map(([b, c]) => (
            <tr key={b}>
              <td className={TD}>{b}</td>
              <td className={NUM}>{n(c.total)}</td>
              <td className={NUM}>{n(c.solved)}</td>
              <td className={NUM}>{n(c.reachable)}</td>
              <td className={NUM}>{n(c.beyond)}</td>
              <td className={NUM}>{n(c.unsampled)}</td>
              <td className={NUM}>{n(c.solved + c.reachable)}</td>
              <td className={NUM}>{n(c.beyond + c.unsampled)}</td>
            </tr>
          ))}
        </Table>
      </Panel>

      {data.backtest.cutoffs.map((c) => (
        <Panel key={c.cutoff} title={`backtest, cutoff ${c.cutoff}`} meta={c.codings.map((k) => `${k.coding} AUC ${f3(k.auc)}`).join(", ")}>
          <div className="flex flex-col gap-2 mb-4">
            {cutoffSummary(c, data).map((s) => (
              <p key={s} className={P}>
                {s}
              </p>
            ))}
          </div>
          {c.codings.map((k) => (
            <div key={k.coding} className="mb-4">
              <h3 className="small-caps text-[11px] tracking-[0.18em] text-[color:var(--basalt-3)] mb-2">{k.label}</h3>
              <Table head={STRATUM_HEAD}>
                <StratumRows rows={[k.all, k.undatedRemoved.all]} />
                <StratumRows rows={k.byLength} />
                <StratumRows rows={k.byBranch} />
              </Table>
              <p className={`${P} mt-2`}>{k.undecidedBounds.map(boundSentence).join("; ")}.</p>
            </div>
          ))}
        </Panel>
      ))}

      <Panel title="where this is weak">
        <div className="flex flex-col gap-3">
          {weakParagraphs(data).map((p) => (
            <p key={p} className={P}>
              {p}
            </p>
          ))}
        </div>
      </Panel>

      {REACH_CLASSES.map((k) => (
        <Panel key={k} title={`predictions: ${k}`} meta={`${n(data.predictions.counts[k])} problems, top ${n(data.predictions.top[k].length)} shown`}>
          <Table head={PREDICTION_HEAD}>
            <PredictionRows rows={data.predictions.top[k]} />
          </Table>
        </Panel>
      ))}

      <Panel title="the atlas problems" meta={`${n(data.predictions.atlas.length)} open atlas problems with records`}>
        <Table head={[...PREDICTION_HEAD.slice(0, 1), "class", ...PREDICTION_HEAD.slice(1)]}>
          {data.predictions.atlas.map((r) => (
            <tr key={r.id}>
              <td className={TD}>
                <span className="font-display text-[13px]">{r.title}</span>
                <span className="block font-mono text-[10px] text-[color:var(--basalt-3)]">{r.id}</span>
              </td>
              <td className={TD}>{r.reachClass}</td>
              <td className={TD}>{r.branch}</td>
              <td className={TD}>{r.status}</td>
              <td className={NUM}>{f3(r.reach)}</td>
              <td className={NUM}>{r.growth}</td>
              <td className={TD}>
                {r.nearest.map((s) => (
                  <span key={s.id} className="block">
                    {s.title} <span className="font-mono text-[10px] text-[color:var(--basalt-3)]">{f3(s.similarity)}</span>
                  </span>
                ))}
              </td>
              <td className={TD}>
                {r.works.length === 0
                  ? <span className="text-[color:var(--basalt-3)]">no record</span>
                  : r.works.map((w) => (
                      <span key={w.title} className="block">
                        {w.title}
                        {w.year ? ` (${w.year})` : ""}
                      </span>
                    ))}
              </td>
            </tr>
          ))}
        </Table>
      </Panel>

      <Panel title="method">
        <div className="flex flex-col gap-3">
          {methodParagraphs(data).map((p) => (
            <p key={p} className={P}>
              {p}
            </p>
          ))}
          <p className={P}>{data.predictions.rule}</p>
        </div>
      </Panel>
    </div>
  );
}

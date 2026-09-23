"use client";

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";
import { DemoButton } from "../_shared/DemoButton";
import { FieldLabel } from "../_shared/FieldLabel";
import { Stat, StatGrid } from "../_shared/Stat";
import { SubmitButton } from "../_shared/SubmitButton";

type StatRow = {
  test: string;
  raw: string;
  reported_p: number;
  computed_p: number | null;
  verdict: string;
};
type GrimRow = { raw: string; mean: number; n: number; verdict: string; grim_testable: boolean };
type Flag = { flag: string; severity: string; detail: string };
type RepliOutput = {
  demo: boolean;
  alpha: number;
  summary: {
    statistics_checked: number;
    inconsistent: number;
    decision_errors: number;
    means_grim_tested: number;
    grim_impossible: number;
    reporting_flags: number;
  };
  reproducibility: string;
  reproducibility_level: string;
  statcheck: StatRow[];
  grim: GrimRow[];
  reporting_flags: Flag[];
  note?: string;
};

const VERDICT_COLOR: Record<string, string> = {
  consistent: "var(--aegean-deep)",
  inconsistent: "var(--gold-deep,var(--basalt-3))",
  "DECISION ERROR": "#b0413e",
  "GRIM-IMPOSSIBLE": "#b0413e",
};

export default function RepliCheckClient() {
  const [text, setText] = useState("");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("replicheck");

  const runDemo = () =>
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "demo" }) },
      "Checking demo Results…",
    );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 8) return;
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) },
      "Recomputing statistics…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <FieldLabel>
            results text (paste reported statistics: t/F/χ²/r + df + p, M/SD/n)
          </FieldLabel>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Reaction times differed, t(24) = 2.13, p = .002. The control showed M = 2.19, SD = 0.8, n = 10…"
            rows={7}
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[13px] leading-[1.6] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] resize-y"
            disabled={busy}
          />
        </label>
        <div className="flex items-center gap-4">
          <SubmitButton disabled={busy || text.trim().length < 8}>
            {busy ? "checking…" : "check stats"}
          </SubmitButton>
          <DemoButton onClick={runDemo} disabled={busy}>
            run a demo Results section
          </DemoButton>
        </div>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <RepliView result={result} />}
    </div>
  );
}

function RepliView({ result }: { result: ResultEnvelope }) {
  const out = result.output as RepliOutput;
  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        reproducibility check (α = {out.alpha}){out.demo ? " · DEMO" : ""}
      </div>

      <div className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-5 mb-6 text-[15px] text-[color:var(--basalt)]">
        {out.reproducibility}
      </div>

      <StatGrid>
        <Stat label="stats checked" value={String(out.summary.statistics_checked)} />
        <Stat label="inconsistent" value={String(out.summary.inconsistent)} />
        <Stat label="decision errors" value={String(out.summary.decision_errors)} />
        <Stat label="GRIM-impossible" value={String(out.summary.grim_impossible)} />
      </StatGrid>

      {out.statcheck.length > 0 && (
        <div className="mt-8">
          <div className="small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-2">
            p-value recomputation
          </div>
          <ul className="flex flex-col gap-2 font-mono text-[12px]">
            {out.statcheck.map((s, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-2 border-b border-[color:var(--hairline)] pb-1">
                <span className="text-[color:var(--basalt)]">{s.raw}</span>
                <span className="text-[color:var(--basalt-3)]">
                  → recomputed p = {s.computed_p ?? "—"}
                </span>
                <span style={{ color: VERDICT_COLOR[s.verdict] ?? "var(--basalt-2)" }}>
                  {s.verdict}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {out.grim.some((g) => g.grim_testable) && (
        <div className="mt-6">
          <div className="small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-2">GRIM test (means)</div>
          <ul className="flex flex-col gap-2 font-mono text-[12px]">
            {out.grim
              .filter((g) => g.grim_testable)
              .map((g, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-2">
                  <span className="text-[color:var(--basalt)]">
                    M = {g.mean}, n = {g.n}
                  </span>
                  <span style={{ color: VERDICT_COLOR[g.verdict] ?? "var(--basalt-2)" }}>{g.verdict}</span>
                </li>
              ))}
          </ul>
        </div>
      )}

      {out.reporting_flags.length > 0 && (
        <div className="mt-6">
          <div className="small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-2">reporting flags</div>
          <ul className="flex flex-col gap-2">
            {out.reporting_flags.map((fl, i) => (
              <li key={i} className="text-[13px] leading-[1.6] text-[color:var(--basalt-2)]">
                <span className="font-mono text-[color:var(--aegean-deep)]">[{fl.severity}]</span> {fl.detail}
              </li>
            ))}
          </ul>
        </div>
      )}

      {out.note && <p className="mt-6 text-[12px] leading-[1.7] text-[color:var(--basalt-3)]">{out.note}</p>}
      <PublishToCanon result={result} />
    </div>
  );
}

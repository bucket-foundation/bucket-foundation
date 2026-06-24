"use client";

// UnitDimCheck client island — SI dimensional analysis, unit conversion, and
// equation dimensional-consistency. Render "json".

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

type UnitOutput = {
  op: string;
  demo: boolean;
  // check
  consistent?: boolean;
  verdict?: string;
  lhs_dimension?: string;
  rhs_dimension?: string;
  lhs?: string;
  rhs?: string;
  // convert
  value_from?: number;
  value_to?: number;
  from?: string;
  to?: string;
  dimension?: string;
  // parse
  unit?: string;
  si_factor?: number;
  dimension_vector?: Record<string, string>;
  note?: string;
};

type Op = "check" | "convert" | "parse";

export default function UnitDimCheckClient() {
  const [op, setOp] = useState<Op>("check");
  const [equation, setEquation] = useState("");
  const [value, setValue] = useState("");
  const [fromU, setFromU] = useState("");
  const [toU, setToU] = useState("");
  const [unit, setUnit] = useState("");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("unitdimcheck");

  const runDemo = () =>
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ op: "demo" }) },
      "Checking N = kg·m/s²…",
    );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let body: Record<string, unknown> = { op };
    if (op === "check") {
      if (!equation.trim()) return;
      body = { op, equation: equation.trim() };
    } else if (op === "convert") {
      if (!value.trim() || !fromU.trim() || !toU.trim()) return;
      body = { op, value: Number(value), from: fromU.trim(), to: toU.trim() };
    } else {
      if (!unit.trim()) return;
      body = { op, unit: unit.trim() };
    }
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
      "Computing…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">operation</span>
          <select
            value={op}
            onChange={(e) => setOp(e.target.value as Op)}
            disabled={busy}
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-3 py-2 text-[14px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] max-w-xs"
          >
            <option value="check">check equation consistency</option>
            <option value="convert">convert a value</option>
            <option value="parse">parse a unit → dimensions</option>
          </select>
        </label>

        {op === "check" && (
          <label className="flex flex-col gap-2">
            <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">equation</span>
            <input
              value={equation}
              onChange={(e) => setEquation(e.target.value)}
              placeholder="e.g. N = kg*m/s^2   (use '=' once)"
              className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[15px] font-mono text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)]"
              disabled={busy}
            />
          </label>
        )}

        {op === "convert" && (
          <div className="flex flex-wrap gap-3">
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="value (e.g. 1)"
              className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[15px] font-mono text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] w-32"
              disabled={busy}
            />
            <input
              value={fromU}
              onChange={(e) => setFromU(e.target.value)}
              placeholder="from (e.g. km)"
              className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[15px] font-mono text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] w-36"
              disabled={busy}
            />
            <input
              value={toU}
              onChange={(e) => setToU(e.target.value)}
              placeholder="to (e.g. m)"
              className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[15px] font-mono text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] w-36"
              disabled={busy}
            />
          </div>
        )}

        {op === "parse" && (
          <label className="flex flex-col gap-2">
            <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">unit</span>
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g. J/(mol*K)"
              className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[15px] font-mono text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] max-w-xs"
              disabled={busy}
            />
          </label>
        )}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={busy}
            className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
          >
            {busy ? "computing…" : "run"}
          </button>
          <button
            type="button"
            onClick={runDemo}
            disabled={busy}
            className="text-[12px] small-caps tracking-[0.12em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4 disabled:opacity-50"
          >
            run a demo (F = m·a)
          </button>
        </div>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <UnitView result={result} />}
    </div>
  );
}

function UnitView({ result }: { result: ResultEnvelope }) {
  const out = result.output as UnitOutput;

  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        {out.op}{out.demo ? " · DEMO" : ""}
      </div>

      {out.op === "check" && (
        <div
          className={`border p-5 ${out.consistent ? "border-[color:var(--gold)]" : "border-[color:var(--basalt)]"} bg-[color:var(--bone)]`}
        >
          <div className="font-display uppercase text-[18px] text-[color:var(--basalt)]">{out.verdict}</div>
          <div className="mt-3 text-[14px] font-mono text-[color:var(--basalt-2)]">
            <div>{out.lhs} → {out.lhs_dimension}</div>
            <div>{out.rhs} → {out.rhs_dimension}</div>
          </div>
        </div>
      )}

      {out.op === "convert" && (
        <div className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-5">
          <div className="text-[20px] font-mono text-[color:var(--basalt)]">
            {out.value_from} {out.from} = {out.value_to} {out.to}
          </div>
          {out.dimension && (
            <div className="mt-2 text-[12px] text-[color:var(--basalt-3)] font-mono">{out.dimension}</div>
          )}
        </div>
      )}

      {out.op === "parse" && (
        <div className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-5">
          <div className="text-[16px] font-mono text-[color:var(--basalt)]">{out.unit}</div>
          <div className="mt-2 text-[13px] text-[color:var(--basalt-2)]">
            SI factor: <span className="font-mono">{out.si_factor}</span>
          </div>
          <div className="mt-1 text-[13px] font-mono text-[color:var(--basalt-2)]">
            {out.dimension_vector
              ? Object.entries(out.dimension_vector).map(([k, v]) => `${k}^${v}`).join("  ·  ") || "dimensionless"
              : ""}
          </div>
        </div>
      )}

      {out.note && <p className="mt-6 text-[12px] leading-[1.7] text-[color:var(--basalt-3)]">{out.note}</p>}
      <PublishToCanon result={result} />
    </div>
  );
}

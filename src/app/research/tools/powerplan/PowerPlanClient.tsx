"use client";

// PowerPlan client island — statistical power / sample-size calculator. Render "json".

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

type PowerOutput = {
  test: string;
  solve_for: string;
  alpha: number;
  power: number;
  effect_size: number;
  effect_size_name: string;
  tails: number;
  n_meaning: string;
  n?: number;
  achieved_power?: number;
  total_N?: number;
  minimum_detectable_effect?: number;
  result: Record<string, number>;
  demo: boolean;
  note?: string;
};

const TESTS = [
  ["two_sample_t", "two-sample t-test"],
  ["one_sample_t", "one-sample / paired t"],
  ["anova", "one-way ANOVA"],
  ["two_proportion", "two proportions"],
  ["correlation", "Pearson correlation"],
];
const SOLVE = [
  ["n", "sample size (n)"],
  ["power", "power"],
  ["effect_size", "min detectable effect"],
  ["alpha", "alpha"],
];

export default function PowerPlanClient() {
  const [test, setTest] = useState("two_sample_t");
  const [solveFor, setSolveFor] = useState("n");
  const [effectSize, setEffectSize] = useState("0.5");
  const [alpha, setAlpha] = useState("0.05");
  const [power, setPower] = useState("0.80");
  const [n, setN] = useState("");
  const [tails, setTails] = useState("2");
  const [kGroups, setKGroups] = useState("3");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("powerplan");

  const runDemo = () =>
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ demo: true }) },
      "Computing demo (d=0.5)…",
    );

  const num = (v: string) => (v.trim() === "" ? undefined : Number(v));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(
      {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          test,
          solve_for: solveFor,
          effect_size: num(effectSize),
          alpha: num(alpha),
          power: num(power),
          n: num(n),
          tails: Number(tails),
          k_groups: Number(kGroups),
          p1: num(p1),
          p2: num(p2),
        }),
      },
      "Solving the power equation…",
    );
  };

  const isProp = test === "two_proportion";
  const numField = (label: string, value: string, set: (v: string) => void, ph: string, disabled = false) => (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">{label}</span>
      <input
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder={ph}
        inputMode="decimal"
        disabled={busy || disabled}
        className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-2.5 text-[14px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] disabled:opacity-40"
      />
    </label>
  );

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">test</span>
            <select value={test} onChange={(e) => setTest(e.target.value)} disabled={busy}
              className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-2.5 text-[14px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)]">
              {TESTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">solve for</span>
            <select value={solveFor} onChange={(e) => setSolveFor(e.target.value)} disabled={busy}
              className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-2.5 text-[14px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)]">
              {SOLVE.filter(([v]) => !(isProp && v === "effect_size")).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {!isProp && numField("effect size", effectSize, setEffectSize, "d / f / r", solveFor === "effect_size")}
          {isProp && numField("p1", p1, setP1, "0.50")}
          {isProp && numField("p2", p2, setP2, "0.60")}
          {numField("alpha", alpha, setAlpha, "0.05", solveFor === "alpha")}
          {numField("power", power, setPower, "0.80", solveFor === "power")}
          {numField("n", n, setN, "per group", solveFor === "n")}
          {test === "anova" && numField("k groups", kGroups, setKGroups, "3")}
          {(test === "two_sample_t" || test === "one_sample_t" || test === "correlation") &&
            numField("tails", tails, setTails, "2")}
        </div>
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={busy}
            className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
          >
            {busy ? "solving…" : "compute"}
          </button>
          <button
            type="button"
            onClick={runDemo}
            disabled={busy}
            className="text-[12px] small-caps tracking-[0.12em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4 disabled:opacity-50"
          >
            run a demo (d=0.5 → n=64)
          </button>
        </div>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <PowerView result={result} />}
    </div>
  );
}

function PowerView({ result }: { result: ResultEnvelope }) {
  const out = result.output as PowerOutput;
  const headline =
    out.solve_for === "n"
      ? `n = ${out.n}`
      : out.solve_for === "power"
        ? `power = ${out.power}`
        : out.solve_for === "effect_size"
          ? `MDE = ${out.minimum_detectable_effect}`
          : `alpha = ${out.alpha}`;
  const sub =
    out.solve_for === "n"
      ? `${out.n_meaning}${out.total_N ? ` · total N = ${out.total_N}` : ""} · achieved power ${out.achieved_power}`
      : out.n_meaning;

  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        power analysis{out.demo ? " · DEMO" : ""}
      </div>

      <div className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6 mb-6">
        <div className="text-[40px] font-display text-[color:var(--basalt)] leading-none">{headline}</div>
        <p className="mt-3 text-[13px] text-[color:var(--basalt-2)]">{sub}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[12px]">
        <span className="border border-[color:var(--hairline)] bg-[color:var(--bone)] px-2 py-1">test: {out.test}</span>
        <span className="border border-[color:var(--hairline)] bg-[color:var(--bone)] px-2 py-1">{out.effect_size_name}: {out.effect_size}</span>
        <span className="border border-[color:var(--hairline)] bg-[color:var(--bone)] px-2 py-1">α: {out.alpha}</span>
        <span className="border border-[color:var(--hairline)] bg-[color:var(--bone)] px-2 py-1">power: {out.power}</span>
      </div>

      {out.note && <p className="mt-6 text-[12px] leading-[1.7] text-[color:var(--basalt-3)]">{out.note}</p>}
      <PublishToCanon result={result} />
    </div>
  );
}

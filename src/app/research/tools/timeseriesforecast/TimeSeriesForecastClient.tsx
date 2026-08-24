"use client";

// TimeSeriesForecast client island, Holt-Winters decompose + forecast +
// holdout backtest. Render "json".

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

type Errors = { MAE: number; RMSE: number; MAPE_pct: number | null };
type Backtest = Errors & {
  holdout_size: number;
  params: { alpha: number; beta: number; gamma: number };
  predicted: number[];
  actual: number[];
  naive_baseline: Errors;
};
type ForecastOutput = {
  demo: boolean;
  n_points: number;
  seasonal_period: number;
  model: string;
  smoothing: { alpha: number; beta: number; gamma: number | null };
  forecast_horizon: number;
  forecast: number[];
  backtest: Backtest | null;
  note?: string;
};

function parseNums(s: string): number[] {
  return s
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => !Number.isNaN(n));
}

export default function TimeSeriesForecastClient() {
  const [values, setValues] = useState("");
  const [period, setPeriod] = useState("");
  const [horizon, setHorizon] = useState("6");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("timeseriesforecast");

  const runDemo = () =>
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ demo: true }) },
      "Forecasting a seasonal series…",
    );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseNums(values);
    if (v.length < 4) return;
    const body: Record<string, unknown> = {
      values: v,
      period: Number(period) || 0,
      horizon: Number(horizon) || 6,
    };
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
      "Fitting Holt-Winters…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            series values (comma- or space-separated)
          </span>
          <textarea
            value={values}
            onChange={(e) => setValues(e.target.value)}
            placeholder="e.g. 10, 12, 14, 11, 13, 15, 12, 14, 16, ..."
            rows={3}
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[14px] font-mono text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)]"
            disabled={busy}
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-2">
            <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
              seasonal period (0 = none)
            </span>
            <input
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="e.g. 12"
              className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[15px] font-mono text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] w-40"
              disabled={busy}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">horizon</span>
            <input
              value={horizon}
              onChange={(e) => setHorizon(e.target.value)}
              placeholder="6"
              className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[15px] font-mono text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] w-28"
              disabled={busy}
            />
          </label>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={busy || parseNums(values).length < 4}
            className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
          >
            {busy ? "forecasting…" : "forecast"}
          </button>
          <button
            type="button"
            onClick={runDemo}
            disabled={busy}
            className="text-[12px] small-caps tracking-[0.12em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4 disabled:opacity-50"
          >
            run a demo (seasonal)
          </button>
        </div>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <ForecastView result={result} />}
    </div>
  );
}

function ForecastView({ result }: { result: ResultEnvelope }) {
  const out = result.output as ForecastOutput;
  const bt = out.backtest;
  const beatsNaive = bt ? bt.MAE < bt.naive_baseline.MAE : false;

  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        {out.model}{out.demo ? " · DEMO" : ""}
      </div>

      <div className="mb-4 text-[13px] text-[color:var(--basalt-2)] font-mono">
        n={out.n_points} · period={out.seasonal_period} · α={out.smoothing.alpha} · β={out.smoothing.beta}
        {out.smoothing.gamma !== null ? ` · γ=${out.smoothing.gamma}` : ""}
      </div>

      <div className="small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-2">
        forecast ({out.forecast_horizon} steps)
      </div>
      <div className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-4 mb-6 font-mono text-[14px] text-[color:var(--basalt)] overflow-x-auto whitespace-pre-wrap">
        {out.forecast.join(", ")}
      </div>

      {bt && (
        <div className={`border p-5 mb-2 ${beatsNaive ? "border-[color:var(--gold)]" : "border-[color:var(--hairline)]"} bg-[color:var(--bone)]`}>
          <div className="small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-2">
            holdout backtest ({bt.holdout_size} points)
          </div>
          <div className="text-[14px] font-mono text-[color:var(--basalt)]">
            Holt-Winters: MAE {bt.MAE} · RMSE {bt.RMSE}
            {bt.MAPE_pct !== null ? ` · MAPE ${bt.MAPE_pct}%` : ""}
          </div>
          <div className="text-[13px] font-mono text-[color:var(--basalt-2)] mt-1">
            naive baseline: MAE {bt.naive_baseline.MAE} · RMSE {bt.naive_baseline.RMSE}
          </div>
          <div className="text-[13px] mt-2 text-[color:var(--basalt-2)]">
            {beatsNaive ? "model beats the naive baseline on the holdout." : "model does not beat naive — treat with caution."}
          </div>
        </div>
      )}

      {out.note && <p className="mt-6 text-[12px] leading-[1.7] text-[color:var(--basalt-3)]">{out.note}</p>}
      <PublishToCanon result={result} />
    </div>
  );
}

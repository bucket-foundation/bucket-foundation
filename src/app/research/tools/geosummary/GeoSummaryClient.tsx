"use client";

// GeoSummary client island — descriptives + trend (Mann-Kendall/Theil-Sen) +
// seasonality + spatial extent over a time/space series. Render "json".

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

type MK = { applicable?: boolean; trend?: string; p_value?: number; "significant_at_0.05"?: boolean; z?: number };
type GeoOutput = {
  descriptives: {
    n: number; n_finite: number; n_missing: number; missing_fraction: number;
    mean: number; std: number; min: number; median: number; max: number;
  };
  trend: {
    ols_slope_per_step?: number; ols_r_squared?: number; theil_sen_slope_per_step?: number;
    mann_kendall?: MK; applicable?: boolean;
  };
  lag1_autocorrelation: number | null;
  seasonality: {
    period: number; amplitude: number; variance_explained_by_season: number;
    peak_phase: number | null; trough_phase: number | null;
  } | null;
  spatial_extent: {
    n_points: number; bbox: { lat_min: number; lat_max: number; lon_min: number; lon_max: number };
    centroid: { lat: number; lon: number }; bbox_diagonal_km: number;
  } | null;
  demo: boolean;
  note?: string;
};

export default function GeoSummaryClient() {
  const [values, setValues] = useState("");
  const [period, setPeriod] = useState("");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("geosummary");

  const runDemo = () =>
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ demo: true }) },
      "Summarizing demo series…",
    );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = values
      .split(/[,\s\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => (/^(nan|null|na|\.)$/i.test(s) ? null : Number(s)));
    if (parsed.length === 0) return;
    void submit(
      {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ values: parsed, period: period.trim() ? Number(period) : undefined }),
      },
      "Computing trend + seasonality…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            series values (comma/space/newline separated; NaN for missing)
          </span>
          <textarea
            value={values}
            onChange={(e) => setValues(e.target.value)}
            placeholder="12.1, 12.4, NaN, 12.9, 13.2, 13.0, 13.6, ..."
            rows={6}
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[13px] leading-[1.6] font-mono text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] resize-y"
            disabled={busy}
          />
        </label>
        <label className="flex flex-col gap-2 max-w-[220px]">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            seasonal period (optional)
          </span>
          <input
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="e.g. 12 (monthly)"
            inputMode="numeric"
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-2.5 text-[14px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)]"
            disabled={busy}
          />
        </label>
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={busy || values.trim().length === 0}
            className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
          >
            {busy ? "summarizing…" : "summarize"}
          </button>
          <button
            type="button"
            onClick={runDemo}
            disabled={busy}
            className="text-[12px] small-caps tracking-[0.12em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4 disabled:opacity-50"
          >
            run a demo (10-yr monthly series)
          </button>
        </div>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <GeoView result={result} />}
    </div>
  );
}

function GeoView({ result }: { result: ResultEnvelope }) {
  const out = result.output as GeoOutput;
  const d = out.descriptives;
  const mk = out.trend?.mann_kendall;
  const cell = (label: string, value: string) => (
    <div className="bg-[color:var(--bone)] p-4">
      <div className="text-[10px] small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-1">{label}</div>
      <div className="text-[16px] font-display text-[color:var(--basalt)]">{value}</div>
    </div>
  );

  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        series summary{out.demo ? " · DEMO" : ""}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--hairline)] mb-6">
        {cell("n (finite)", `${d.n_finite} / ${d.n}`)}
        {cell("missing", `${d.n_missing} (${(d.missing_fraction * 100).toFixed(1)}%)`)}
        {cell("mean ± std", `${d.mean} ± ${d.std}`)}
        {cell("range", `${d.min} … ${d.max}`)}
      </div>

      {out.trend && out.trend.theil_sen_slope_per_step !== undefined && (
        <div className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6 mb-6">
          <div className="small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-2">trend</div>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-[14px] text-[color:var(--basalt-2)]">
            <span>Theil-Sen slope: <span className="font-mono text-[color:var(--basalt)]">{out.trend.theil_sen_slope_per_step}</span> /step</span>
            <span>OLS slope: <span className="font-mono text-[color:var(--basalt)]">{out.trend.ols_slope_per_step}</span> (R²={out.trend.ols_r_squared})</span>
          </div>
          {mk?.applicable !== false && mk?.trend && (
            <p className="mt-3 text-[14px] text-[color:var(--basalt)]">
              Mann-Kendall: <strong>{mk.trend}</strong>
              {mk["significant_at_0.05"] ? " (significant at α=.05" : " (not significant"}
              {typeof mk.p_value === "number" ? `, p=${mk.p_value})` : ")"}
            </p>
          )}
          {out.lag1_autocorrelation !== null && (
            <p className="mt-1 text-[12px] text-[color:var(--basalt-3)]">
              lag-1 autocorrelation = {out.lag1_autocorrelation} (high values inflate trend significance — interpret with care)
            </p>
          )}
        </div>
      )}

      {out.seasonality && (
        <div className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6 mb-6">
          <div className="small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-2">
            seasonality (period {out.seasonality.period})
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-[14px] text-[color:var(--basalt-2)]">
            <span>amplitude: <span className="font-mono text-[color:var(--basalt)]">{out.seasonality.amplitude}</span></span>
            <span>variance explained: <span className="font-mono text-[color:var(--basalt)]">{(out.seasonality.variance_explained_by_season * 100).toFixed(1)}%</span></span>
            <span>peak phase: {out.seasonality.peak_phase}</span>
          </div>
        </div>
      )}

      {out.spatial_extent && (
        <div className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6 mb-6">
          <div className="small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-2">spatial extent</div>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-[14px] text-[color:var(--basalt-2)]">
            <span>{out.spatial_extent.n_points} points</span>
            <span>centroid: {out.spatial_extent.centroid.lat}, {out.spatial_extent.centroid.lon}</span>
            <span>bbox span: <span className="font-mono text-[color:var(--basalt)]">{out.spatial_extent.bbox_diagonal_km} km</span></span>
          </div>
        </div>
      )}

      {out.note && <p className="mt-6 text-[12px] leading-[1.7] text-[color:var(--basalt-3)]">{out.note}</p>}
      <PublishToCanon result={result} />
    </div>
  );
}

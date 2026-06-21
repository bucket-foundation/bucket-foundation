"use client";

// AFM-CurveML client island — contact-point detection + Hertz/Sneddon Young's
// modulus fit (REAL scipy). Render is "json". Inputs: z[nm] + force[nN] arrays,
// or "demo".

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

type AFMFit = {
  youngs_modulus_pa: number;
  youngs_modulus_kpa: number;
  geometry: string;
  poisson_ratio: number;
  r_squared: number;
  converged: boolean;
};
type AFMOutput = {
  method: string;
  demo: boolean;
  geometry: string;
  radius_nm: number;
  n_points: number;
  contact_point_index: number;
  contact_point_z_nm: number;
  max_indentation_nm: number;
  fit: AFMFit;
  adhesion_nn: number;
  fit_quality: string;
  ground_truth_modulus_kpa?: number;
  note?: string;
};

function parseNums(raw: string): number[] | null {
  const toks = raw.trim().replace(/^\[|\]$/g, "").split(/[\s,]+/).filter(Boolean);
  const nums = toks.map(Number);
  if (nums.length === 0 || nums.some((x) => !Number.isFinite(x))) return null;
  return nums;
}

export default function AFMCurveClient() {
  const [zText, setZText] = useState("");
  const [fText, setFText] = useState("");
  const [geometry, setGeometry] = useState("sphere");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("afmcurveml");

  const runDemo = () =>
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ z: "demo", geometry }) },
      "Fitting demo curve…",
    );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const z = parseNums(zText);
    const f = parseNums(fText);
    if (!z || !f) return;
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ z, force: f, geometry }) },
      "Fitting modulus…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            z position (nm) — comma / space separated
          </span>
          <textarea
            value={zText}
            onChange={(e) => setZText(e.target.value)}
            placeholder="0, 5, 10, 15, …"
            rows={3}
            className="font-mono bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[12px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] resize-y"
            disabled={busy}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            force (nN) — same length as z
          </span>
          <textarea
            value={fText}
            onChange={(e) => setFText(e.target.value)}
            placeholder="0.0, 0.0, 0.01, 0.05, …"
            rows={3}
            className="font-mono bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[12px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] resize-y"
            disabled={busy}
          />
        </label>
        <label className="flex flex-col gap-2 max-w-[200px]">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">tip geometry</span>
          <select
            value={geometry}
            onChange={(e) => setGeometry(e.target.value)}
            className="font-mono bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[14px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)]"
            disabled={busy}
          >
            <option value="sphere">sphere (Hertz)</option>
            <option value="cone">cone (Sneddon)</option>
          </select>
        </label>
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={busy || !parseNums(zText) || !parseNums(fText)}
            className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
          >
            {busy ? "fitting…" : "fit modulus"}
          </button>
          <button
            type="button"
            onClick={runDemo}
            disabled={busy}
            className="text-[12px] small-caps tracking-[0.12em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4 disabled:opacity-50"
          >
            run a demo curve (known modulus)
          </button>
        </div>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <AFMView result={result} />}
    </div>
  );
}

function AFMView({ result }: { result: ResultEnvelope }) {
  const out = result.output as AFMOutput;
  const stat = (label: string, value: string) => (
    <div className="bg-[color:var(--bone)] p-5">
      <div className="text-[11px] small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-1">{label}</div>
      <div className="text-[18px] font-display text-[color:var(--basalt)]">{value}</div>
    </div>
  );

  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        {out.geometry} Hertz/Sneddon fit{out.demo ? " · DEMO (synthetic curve)" : ""} · fit {out.fit_quality}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--hairline)]">
        {stat("Young's E", `${out.fit.youngs_modulus_kpa.toFixed(2)} kPa`)}
        {stat("R²", out.fit.r_squared.toFixed(4))}
        {stat("contact z", `${out.contact_point_z_nm.toFixed(1)} nm`)}
        {stat("adhesion", `${out.adhesion_nn.toFixed(3)} nN`)}
      </div>

      {out.ground_truth_modulus_kpa != null && (
        <div className="mt-6 border border-[color:var(--hairline)] bg-[color:var(--bone)] p-4 text-[14px] text-[color:var(--aegean-deep)]">
          recovered {out.fit.youngs_modulus_kpa.toFixed(2)} kPa vs known {out.ground_truth_modulus_kpa.toFixed(2)} kPa
          {" "}
          ({(
            (Math.abs(out.fit.youngs_modulus_kpa - out.ground_truth_modulus_kpa) /
              out.ground_truth_modulus_kpa) *
            100
          ).toFixed(1)}
          % error).
        </div>
      )}

      {out.note && <p className="mt-6 text-[12px] leading-[1.7] text-[color:var(--basalt-3)]">{out.note}</p>}
      <PublishToCanon result={result} />
    </div>
  );
}

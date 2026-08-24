"use client";

// MaterialsFeaturizer client island, Magpie-style composition descriptors from
// a chemical formula. Render "json".

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

type DescStat = { mean: number; min: number; max: number; range: number; avg_deviation: number; mode: number | null };
type MaterialsOutput = {
  formula: string;
  composition: Record<string, number>;
  atomic_fractions: Record<string, number>;
  n_elements: number;
  molar_mass_g_per_mol: number;
  descriptors: Record<string, DescStat>;
  feature_vector: Record<string, number>;
  n_features: number;
  demo: boolean;
  note?: string;
};

const PROP_LABEL: Record<string, string> = {
  atomic_number: "atomic number",
  atomic_weight: "atomic weight",
  electronegativity: "electronegativity (Pauling)",
  atomic_radius: "atomic radius (pm)",
  melting_point: "melting point (K)",
  period: "period",
  group: "group",
  n_valence: "valence electrons",
};

export default function MaterialsFeaturizerClient() {
  const [formula, setFormula] = useState("");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("materialsfeaturizer");

  const runDemo = () =>
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ demo: true }) },
      "Featurizing NaCl…",
    );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formula.trim()) return;
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ formula: formula.trim() }) },
      "Computing descriptors…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            chemical formula
          </span>
          <input
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            placeholder="e.g. Fe2O3, GaAs, La0.7Sr0.3MnO3, Mg(OH)2"
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[15px] font-mono text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)]"
            disabled={busy}
          />
        </label>
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={busy || !formula.trim()}
            className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
          >
            {busy ? "featurizing…" : "featurize"}
          </button>
          <button
            type="button"
            onClick={runDemo}
            disabled={busy}
            className="text-[12px] small-caps tracking-[0.12em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4 disabled:opacity-50"
          >
            run a demo (NaCl)
          </button>
        </div>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <MaterialsView result={result} />}
    </div>
  );
}

function MaterialsView({ result }: { result: ResultEnvelope }) {
  const out = result.output as MaterialsOutput;
  const cell = (label: string, value: string) => (
    <div className="bg-[color:var(--bone)] p-5">
      <div className="text-[11px] small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-1">{label}</div>
      <div className="text-[18px] font-display text-[color:var(--basalt)]">{value}</div>
    </div>
  );

  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        {out.formula} descriptors{out.demo ? " · DEMO" : ""}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-[color:var(--hairline)] mb-6">
        {cell("elements", String(out.n_elements))}
        {cell("molar mass", `${out.molar_mass_g_per_mol} g/mol`)}
        {cell("ML features", String(out.n_features))}
      </div>

      <div className="mb-6">
        <div className="small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-2">composition</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(out.atomic_fractions).map(([el, f]) => (
            <span key={el} className="border border-[color:var(--hairline)] bg-[color:var(--bone)] px-2 py-1 text-[13px] font-mono">
              {el} {(f * 100).toFixed(1)}%
            </span>
          ))}
        </div>
      </div>

      <div className="small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-2">
        elemental-property descriptors (Magpie)
      </div>
      <div className="overflow-x-auto border border-[color:var(--hairline)]">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-[color:var(--bone)] text-[color:var(--basalt-3)] small-caps tracking-[0.1em] text-[11px]">
              <th className="text-left px-3 py-2">property</th>
              <th className="text-right px-3 py-2">mean</th>
              <th className="text-right px-3 py-2">range</th>
              <th className="text-right px-3 py-2">avg dev</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(out.descriptors).map(([prop, st]) => (
              <tr key={prop} className="border-t border-[color:var(--hairline)] bg-[color:var(--bone)]">
                <td className="px-3 py-2 text-[color:var(--basalt-2)]">{PROP_LABEL[prop] ?? prop}</td>
                <td className="px-3 py-2 text-right font-mono text-[color:var(--basalt)]">{st.mean}</td>
                <td className="px-3 py-2 text-right font-mono text-[color:var(--basalt-2)]">{st.range}</td>
                <td className="px-3 py-2 text-right font-mono text-[color:var(--basalt-2)]">{st.avg_deviation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {out.note && <p className="mt-6 text-[12px] leading-[1.7] text-[color:var(--basalt-3)]">{out.note}</p>}
      <PublishToCanon result={result} />
    </div>
  );
}

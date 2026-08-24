"use client";

// StoichBalance client island, exact null-space equation balancing + limiting
// reagent. Render "json".

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

type Stoich = {
  supplied_moles: Record<string, number>;
  limiting_reagent: string;
  extent_of_reaction: number;
  product_moles: Record<string, number>;
  reactant_moles_remaining: Record<string, number>;
};
type StoichOutput = {
  demo: boolean;
  input_equation: string;
  balanced_equation: string;
  reactants: string[];
  products: string[];
  coefficients: number[];
  elements: string[];
  molar_masses_g_per_mol: Record<string, number>;
  stoichiometry?: Stoich;
  note?: string;
};

export default function StoichBalanceClient() {
  const [equation, setEquation] = useState("");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("stoichbalance");

  const runDemo = () =>
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ demo: true }) },
      "Balancing H2 + O2 → H2O…",
    );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!equation.trim()) return;
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ equation: equation.trim() }) },
      "Balancing…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            chemical equation
          </span>
          <input
            value={equation}
            onChange={(e) => setEquation(e.target.value)}
            placeholder="e.g. C3H8 + O2 -> CO2 + H2O   (use -> or =)"
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[15px] font-mono text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)]"
            disabled={busy}
          />
        </label>
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={busy || !equation.trim()}
            className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
          >
            {busy ? "balancing…" : "balance"}
          </button>
          <button
            type="button"
            onClick={runDemo}
            disabled={busy}
            className="text-[12px] small-caps tracking-[0.12em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4 disabled:opacity-50"
          >
            run a demo (water)
          </button>
        </div>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <StoichView result={result} />}
    </div>
  );
}

function StoichView({ result }: { result: ResultEnvelope }) {
  const out = result.output as StoichOutput;
  const s = out.stoichiometry;

  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        balanced equation{out.demo ? " · DEMO" : ""}
      </div>

      <div className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-5 mb-6">
        <div className="text-[20px] font-mono text-[color:var(--basalt)]">{out.balanced_equation}</div>
        <div className="mt-2 text-[12px] text-[color:var(--basalt-3)] font-mono">
          coefficients: [{out.coefficients.join(", ")}] · elements: {out.elements.join(", ")}
        </div>
      </div>

      {s && (
        <div className="mb-6">
          <div className="small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-2">stoichiometry</div>
          <div className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-5 text-[14px] text-[color:var(--basalt-2)]">
            <div>
              limiting reagent:{" "}
              <span className="font-mono text-[color:var(--basalt)]">{s.limiting_reagent}</span>
              {"  ·  extent: "}
              <span className="font-mono text-[color:var(--basalt)]">{s.extent_of_reaction}</span>
            </div>
            <div className="mt-2">
              products formed (mol):{" "}
              {Object.entries(s.product_moles).map(([k, v]) => (
                <span key={k} className="font-mono mr-3">{k}={v}</span>
              ))}
            </div>
            <div className="mt-2">
              reactant remaining (mol):{" "}
              {Object.entries(s.reactant_moles_remaining).map(([k, v]) => (
                <span key={k} className="font-mono mr-3">{k}={v}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {Object.keys(out.molar_masses_g_per_mol).length > 0 && (
        <div className="mb-2">
          <div className="small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-2">molar masses</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(out.molar_masses_g_per_mol).map(([sp, mm]) => (
              <span key={sp} className="border border-[color:var(--hairline)] bg-[color:var(--bone)] px-2 py-1 text-[13px] font-mono">
                {sp} {mm} g/mol
              </span>
            ))}
          </div>
        </div>
      )}

      {out.note && <p className="mt-6 text-[12px] leading-[1.7] text-[color:var(--basalt-3)]">{out.note}</p>}
      <PublishToCanon result={result} />
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import type { PrimeDirections } from "@ros/advisor-review";
import type { Api } from "../api";
import { readJsonFile } from "./file";

type Set = PrimeDirections & { imported_at: number };

export function PrimesView({ api }: { api: Api }) {
  const [sets, setSets] = useState<Set[] | null>(null);
  const [corpus, setCorpus] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(() => {
    api.primeDirections().then(
      (s) => {
        setSets(s);
        setCorpus((c) => (c && s.some((x) => x.corpus === c) ? c : (s[0]?.corpus ?? null)));
      },
      (e: Error) => setStatus(e.message),
    );
  }, [api]);

  useEffect(load, [load]);

  const onFile = async (f: File | undefined) => {
    const parsed = await readJsonFile(f);
    if (!parsed.ok) return setStatus(parsed.error);
    try {
      const r = await api.importPrimeDirections(parsed.value);
      setStatus(`Opened ${r.corpus}, ${r.components} directions.`);
      setCorpus(r.corpus);
      load();
    } catch (e) {
      setStatus((e as Error).message);
    }
  };

  if (!sets) return <p className="muted">Loading prime directions…</p>;
  const set = sets.find((s) => s.corpus === corpus) ?? null;

  return (
    <section>
      <header className="head">
        <h1>Prime directions</h1>
        <p className="muted">{set ? `${set.corpus}: ${set.docs.toLocaleString()} documents, ${set.terms.toLocaleString()} terms` : "Open a prime.json from prime_directions run."}</p>
      </header>
      <div className="toolbar">
        <label className="file">
          <input type="file" accept="application/json,.json" onChange={(e) => void onFile(e.target.files?.[0])} />
          <span>Open prime.json</span>
        </label>
        {sets.length > 1 && (
          <select value={corpus ?? ""} onChange={(e) => setCorpus(e.target.value)}>
            {sets.map((s) => (
              <option key={s.corpus} value={s.corpus}>
                {s.corpus}
              </option>
            ))}
          </select>
        )}
      </div>
      {status && <p className="status">{status}</p>}
      {set && (
        <div className="split">
          <div className="panel">
            <Spokes set={set} />
          </div>
          <ol className="panel components">
            {set.components.map((c) => (
              <li key={c.index}>
                <b>{c.index}</b>
                <span>
                  {c.top_terms.slice(0, 6).join(", ")}
                  {c.bottom_terms.length > 0 && <span className="muted small"> against {c.bottom_terms.slice(0, 3).join(", ")}</span>}
                </span>
                <span className="muted small">{(c.variance_ratio * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function Spokes({ set }: { set: Set }) {
  const max = Math.max(...set.components.map((c) => c.variance_ratio), 1e-9);
  const R = 150;
  return (
    <svg viewBox="-220 -200 440 400" className="spokes" role="img" aria-label={`${set.components.length} prime directions of ${set.corpus}`}>
      <circle r={R} className="ring" />
      <circle r={R / 2} className="ring" />
      {set.components.map((c) => {
        const a = ((c.angle_deg - 90) * Math.PI) / 180;
        const len = 30 + (R - 30) * (c.variance_ratio / max);
        const x = Math.cos(a) * len;
        const y = Math.sin(a) * len;
        const lx = Math.cos(a) * (R + 14);
        const ly = Math.sin(a) * (R + 14);
        return (
          <g key={c.index}>
            <line x1={0} y1={0} x2={x} y2={y} className="spoke" />
            <circle cx={x} cy={y} r={4} className="tip" />
            <text x={lx} y={ly} textAnchor={lx < -5 ? "end" : lx > 5 ? "start" : "middle"} dominantBaseline="middle">
              {c.top_terms[0] ?? c.index}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

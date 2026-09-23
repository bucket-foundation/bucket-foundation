"use client";

// CellSegTrack client island, cell segmentation (cellpose if installed, else a
// real Otsu + distance-transform watershed). Render is "json". `image` is a
// 2-D numeric array (rows) or "demo".

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

type Cell = { id: number; area_px: number; centroid: [number, number]; bbox: number[] };
type SegOutput = {
  method: string;
  backend: string;
  cellpose_available: boolean;
  demo: boolean;
  image_shape: [number, number];
  n_cells: number;
  area_px: { mean: number; median: number; min: number; max: number };
  cells: Cell[];
  ground_truth_n_cells?: number;
  note?: string;
};

function parseImage(raw: string): number[][] | null {
  const t = raw.trim();
  try {
    const v = JSON.parse(t);
    if (Array.isArray(v) && v.length > 0 && Array.isArray(v[0])) {
      const rows = v as number[][];
      if (rows.every((r) => r.every((x) => Number.isFinite(Number(x))))) return rows;
    }
  } catch {
    /* fall through to line parser */
  }
  // line-per-row, space/comma separated
  const lines = t.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;
  const rows = lines.map((l) => l.split(/[\s,]+/).map(Number));
  if (rows.some((r) => r.length !== rows[0].length || r.some((x) => !Number.isFinite(x)))) return null;
  return rows;
}

export default function CellSegClient() {
  const [imgText, setImgText] = useState("");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("cellsegtrack");

  const runDemo = () =>
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ image: "demo" }) },
      "Segmenting demo field…",
    );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const img = parseImage(imgText);
    if (!img) return;
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ image: img }) },
      "Segmenting…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <FieldLabel>
            grayscale image — one row per line, or a JSON 2-D array
          </FieldLabel>
          <textarea
            value={imgText}
            onChange={(e) => setImgText(e.target.value)}
            placeholder={"0 0 5 80 80 5 0\n0 0 8 90 88 6 0\n…"}
            rows={5}
            className="font-mono bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[12px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] resize-y"
            disabled={busy}
          />
        </label>
        <div className="flex items-center gap-4">
          <SubmitButton disabled={busy || !parseImage(imgText)}>
            {busy ? "segmenting…" : "segment cells"}
          </SubmitButton>
          <DemoButton onClick={runDemo} disabled={busy}>
            run a demo image (known count)
          </DemoButton>
        </div>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <SegView result={result} />}
    </div>
  );
}

function SegView({ result }: { result: ResultEnvelope }) {
  const out = result.output as SegOutput;
  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        {out.backend}
        {out.demo ? " · DEMO (synthetic field)" : ""} · {out.image_shape[0]}×{out.image_shape[1]}
      </div>
      <StatGrid>
        <Stat label="cells" value={String(out.n_cells)} />
        <Stat label="mean area" value={`${out.area_px.mean} px`} />
        <Stat label="median area" value={`${out.area_px.median} px`} />
        <Stat label="area range" value={`${out.area_px.min}–${out.area_px.max}`} />
      </StatGrid>

      {out.cells.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="text-left small-caps tracking-[0.1em] text-[color:var(--basalt-3)]">
                <th className="py-2 pr-4">id</th>
                <th className="py-2 pr-4">area (px)</th>
                <th className="py-2 pr-4">centroid (y, x)</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {out.cells.slice(0, 30).map((c) => (
                <tr key={c.id} className="border-t border-[color:var(--hairline)]">
                  <td className="py-1.5 pr-4">{c.id}</td>
                  <td className="py-1.5 pr-4">{c.area_px}</td>
                  <td className="py-1.5 pr-4">
                    ({c.centroid[0].toFixed(1)}, {c.centroid[1].toFixed(1)})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {out.ground_truth_n_cells != null && (
        <div
          className="mt-6 border p-4 text-[14px]"
          style={{
            borderColor: "var(--hairline)",
            background: "var(--bone)",
            color: out.n_cells === out.ground_truth_n_cells ? "var(--aegean-deep)" : "var(--basalt)",
          }}
        >
          {out.n_cells === out.ground_truth_n_cells
            ? `✓ segmented all ${out.ground_truth_n_cells} cells (exact match).`
            : `segmented ${out.n_cells} of ${out.ground_truth_n_cells} cells.`}
        </div>
      )}

      {out.note && <p className="mt-6 text-[12px] leading-[1.7] text-[color:var(--basalt-3)]">{out.note}</p>}
      <PublishToCanon result={result} />
    </div>
  );
}

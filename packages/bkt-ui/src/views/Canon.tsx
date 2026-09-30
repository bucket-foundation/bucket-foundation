import { lazy, Suspense, useMemo, useState } from "react";
import { BRANCH_ORDER, branchIndex, CIRCLE_INNER, CIRCLE_OUTER, ringRadius, type ThetaSort } from "@/components/canon-globe/projections";
import type { CanonMarker } from "@/components/canon-globe/CanonMarkers";
import { markersAt, MAX_YEAR, MIN_YEAR, thetaFor, type ExplorerMarker } from "@/lib/canon-explorer/markers";

const Globe3d = lazy(() => import("./Globe3d"));

const COLOR: Record<string, string> = {
  mathematics: "#D9A43A",
  physics: "#3E6FA8",
  chemistry: "#9B5A2C",
  information: "#557B66",
  biophysics: "#8E3E3E",
  cosmology: "#5B4882",
  mind: "#C2873E",
  "deep-history": "#7A5D3E",
  "sacred-texts": "#A0863F",
};
const SITE = "#6E5840";
const SORTS: { id: ThetaSort; label: string }[] = [
  { id: "rank", label: "similarity" },
  { id: "year", label: "year" },
  { id: "branch", label: "branch" },
];

const color = (m: ExplorerMarker) => (m.kind === "archaeological-site" ? SITE : (COLOR[m.branch.replace(/^\d+-/, "")] ?? "#D9A43A"));
const fmtYear = (y: number) => (y < 0 ? `${-y} BCE` : `${y}`);
const https = (u?: string) => (u && /^https:\/\//.test(u) ? u : null);

export function CanonView() {
  const [view, setView] = useState<"circle" | "globe">("circle");
  const [sort, setSort] = useState<ThetaSort>("rank");
  const [year, setYear] = useState(MAX_YEAR);
  const [figures, setFigures] = useState(true);
  const [sites, setSites] = useState(true);
  const [branch, setBranch] = useState<string | null>(null);
  const [picked, setPicked] = useState<ExplorerMarker | null>(null);

  const markers = useMemo(() => markersAt(year, { figures, sites, branch }), [year, figures, sites, branch]);
  const theta = useMemo(() => thetaFor(sort), [sort]);

  return (
    <section>
      <header className="head">
        <h1>Canon</h1>
        <p className="muted">
          {markers.length} figures and sites by {fmtYear(year)}. Circle needs no graphics card; Globe loads on demand.
        </p>
      </header>
      <div className="toolbar">
        <div className="seg">
          {(["circle", "globe"] as const).map((v) => (
            <button key={v} className={view === v ? "on" : ""} onClick={() => setView(v)}>
              {v === "circle" ? "Circle" : "Globe"}
            </button>
          ))}
        </div>
        {view === "circle" && (
          <select value={sort} onChange={(e) => setSort(e.target.value as ThetaSort)}>
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                Order by {s.label}
              </option>
            ))}
          </select>
        )}
        <select value={branch ?? ""} onChange={(e) => setBranch(e.target.value || null)}>
          <option value="">All branches</option>
          {BRANCH_ORDER.map((b) => (
            <option key={b} value={b}>
              {b.replace(/-/g, " ")}
            </option>
          ))}
        </select>
        <label className="check">
          <input type="checkbox" checked={figures} onChange={(e) => setFigures(e.target.checked)} /> figures
        </label>
        <label className="check">
          <input type="checkbox" checked={sites} onChange={(e) => setSites(e.target.checked)} /> sites
        </label>
      </div>
      <label className="year">
        <span>{fmtYear(year)}</span>
        <input type="range" min={MIN_YEAR} max={MAX_YEAR} value={year} onChange={(e) => setYear(Number(e.target.value))} />
      </label>
      <div className="split canon">
        <div className="panel stage">
          {view === "circle" ? (
            <Circle markers={markers} theta={theta} picked={picked} onPick={setPicked} />
          ) : (
            <Suspense fallback={<p className="muted">Loading the globe…</p>}>
              <div className="globe-box">
                <Globe3d markers={markers as CanonMarker[]} onSelect={(m) => setPicked(m)} />
              </div>
            </Suspense>
          )}
        </div>
        <aside className="panel card">
          {picked ? (
            <>
              <span className="tag ghost">{picked.kind === "archaeological-site" ? "site" : picked.branch.replace(/^\d+-/, "").replace(/-/g, " ")}</span>
              <h2>{picked.title}</h2>
              <p className="muted">{picked.year !== undefined ? fmtYear(picked.year) : ""}</p>
              {picked.civilization && <p>{picked.civilization}</p>}
              <p className="links">
                {https(picked.wikipedia) && (
                  <a href={https(picked.wikipedia)!} target="_blank" rel="noreferrer noopener">
                    Wikipedia
                  </a>
                )}
                {https(picked.unesco) && (
                  <a href={https(picked.unesco)!} target="_blank" rel="noreferrer noopener">
                    UNESCO
                  </a>
                )}
              </p>
            </>
          ) : (
            <p className="muted">Pick a point to read about it.</p>
          )}
        </aside>
      </div>
    </section>
  );
}

function Circle({ markers, theta, picked, onPick }: { markers: ExplorerMarker[]; theta: (m: ExplorerMarker) => number; picked: ExplorerMarker | null; onPick: (m: ExplorerMarker) => void }) {
  const R = 150;
  const rings = BRANCH_ORDER.map((b) => ({ b, r: ringRadius(b, R) }));
  return (
    <svg viewBox="-250 -250 500 500" className="circle-view" role="img" aria-label={`${markers.length} canon points on a circle`}>
      <circle r={R * CIRCLE_INNER * 0.9} className="core" />
      {rings.map(({ b, r }) => (
        <circle key={b} r={r} className="ring" />
      ))}
      {rings.map(({ b, r }) => (
        <text key={`${b}-l`} x={4} y={-r - 2} className="ring-label">
          {b.replace(/-/g, " ")}
        </text>
      ))}
      {markers.map((m) => {
        const a = theta(m) + Math.PI / 2;
        const r = ringRadius(m.branch, R) + ((branchIndex(m.branch) % 2) - 0.5) * 3;
        const x = r * Math.cos(a);
        const y = -r * Math.sin(a);
        const on = picked?.id === m.id && picked.kind === m.kind;
        return (
          <circle key={`${m.kind}-${m.id}`} cx={x} cy={y} r={on ? 6 : 3.2} fill={color(m)} className={on ? "pt on" : "pt"} onClick={() => onPick(m)}>
            <title>{`${m.title}${m.year !== undefined ? `, ${fmtYear(m.year)}` : ""}`}</title>
          </circle>
        );
      })}
      <circle r={R * CIRCLE_OUTER + 18} className="edge" />
    </svg>
  );
}

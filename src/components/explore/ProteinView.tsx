"use client";

import { useEffect, useRef, useState } from "react";
import type { GLViewer } from "3dmol";
import { formatOf, summarize, type ProteinEntry, type ResidueLink, type StructureSummary } from "@/lib/explore/protein";

interface Props {
  protein: ProteinEntry;
  focus: ResidueLink | null;
  onFocus(r: ResidueLink | null): void;
}

type Style = "cartoon" | "surface";

const mono = { fontFamily: "var(--font-jetbrains)" };

export default function ProteinView({ protein, focus, onFocus }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const viewer = useRef<GLViewer | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<{ text: string; format: "pdb" | "cif"; name: string } | null>(null);
  const [summary, setSummary] = useState<StructureSummary | null>(null);
  const [style, setStyle] = useState<Style>("cartoon");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setData(null);
    fetch(protein.file)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`fixture ${r.status}`))))
      .then((text) => live && setData({ text, format: "pdb", name: protein.pdb }))
      .catch((e) => live && setError(String(e.message ?? e)));
    return () => {
      live = false;
    };
  }, [protein]);

  useEffect(() => {
    if (!data || !host.current) return;
    let live = true;
    setError(null);
    import("3dmol").then(($3Dmol) => {
      if (!live || !host.current) return;
      const v = viewer.current ?? $3Dmol.createViewer(host.current, { backgroundColor: "#141311" });
      viewer.current = v;
      v.removeAllModels();
      v.removeAllSurfaces();
      try {
        v.addModel(data.text, data.format);
      } catch (e) {
        setError(`Could not read ${data.name}: ${e instanceof Error ? e.message : String(e)}`);
        return;
      }
      setSummary(summarize(data.text, data.format));
      v.setStyle({}, { cartoon: { color: "spectrum" } });
      if (style === "surface") v.addSurface($3Dmol.SurfaceType.VDW, { opacity: 0.7, color: "#C9B27A" });
      const ids = data.name === protein.pdb ? protein.residues : [];
      for (const r of ids) {
        const on = focus && focus.chain === r.chain && focus.resi === r.resi;
        v.addStyle({ chain: r.chain, resi: r.resi }, { stick: { color: on ? "#E0A33A" : "#8E3E3E", radius: on ? 0.35 : 0.2 } });
      }
      v.zoomTo(focus && data.name === protein.pdb ? { chain: focus.chain, resi: focus.resi } : undefined);
      if (focus && data.name === protein.pdb) v.zoom(0.35);
      v.render();
    });
    return () => {
      live = false;
    };
  }, [data, style, focus, protein]);

  useEffect(
    () => () => {
      viewer.current?.clear();
      viewer.current = null;
    },
    [],
  );

  const load = async (f: File) => {
    const text = await f.text();
    onFocus(null);
    setData({ text, format: formatOf(f.name), name: f.name });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mt-3 text-sm" style={mono}>
        <button className="border hairline px-3 py-1" onClick={() => input.current?.click()}>
          Load PDB or mmCIF
        </button>
        <input ref={input} type="file" accept=".pdb,.ent,.cif,.mmcif" hidden data-testid="protein-file" onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
        {(["cartoon", "surface"] as Style[]).map((s) => (
          <button key={s} data-testid={`protein-style-${s}`} className="border hairline px-3 py-1" style={{ background: s === style ? "var(--gold, #D9A43A)" : undefined }} onClick={() => setStyle(s)}>
            {s}
          </button>
        ))}
        <span style={{ color: "var(--parchment-dim)" }}>
          {summary ? `${data?.name} · ${summary.chains.join(",")} · ${summary.residues} residues` : "loading"} · files stay in this browser · {protein.credit}
        </span>
      </div>
      {error && <p role="alert" className="mt-2 text-sm">{error}</p>}
      <div data-testid="explore-scene" className="relative w-full h-[420px] md:h-[520px] border hairline mt-3" style={{ background: "#141311" }}>
        <div ref={host} data-testid="protein-canvas" className="absolute inset-0" />
      </div>
    </div>
  );
}

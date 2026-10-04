"use client";

import { useEffect, useRef, useState } from "react";
import type { GLViewer } from "3dmol";
import { useSceneTheme } from "./useSceneTheme";
import { surfaceEligible } from "./protein-surface";

export const PROTEIN_OFFLINE = "The protein viewer could not start here, so this structure is hidden.";
import { formatOf, summarize, type ProteinEntry, type ResidueLink, type StructureSummary } from "@/lib/explore/protein";

interface Props {
  protein: ProteinEntry;
  focus: ResidueLink | null;
  onFocus(r: ResidueLink | null): void;
  upload?: { text: string; format: "pdb" | "cif"; name: string } | null;
}

type Style = "cartoon" | "backbone" | "surface";

const mono = { fontFamily: "var(--font-jetbrains)" };

export default function ProteinView({ protein, focus, onFocus, upload }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const theme = useSceneTheme();
  const paper = useRef(theme.paper);
  paper.current = theme.paper;
  const viewer = useRef<GLViewer | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<{ text: string; format: "pdb" | "cif"; name: string } | null>(null);
  const [summary, setSummary] = useState<StructureSummary | null>(null);
  const [style, setStyle] = useState<Style>("cartoon");
  const [error, setError] = useState<string | null>(null);
  const [surfaceReady, setSurfaceReady] = useState(false);

  useEffect(() => {
    let live = true;
    setData(null);
    fetch(protein.file)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(PROTEIN_OFFLINE))))
      .then((text) => live && setData({ text, format: "pdb", name: protein.pdb }))
      .catch(() => live && setError(PROTEIN_OFFLINE));
    return () => {
      live = false;
    };
  }, [protein]);

  useEffect(() => {
    if (upload) setData(upload);
  }, [upload]);

  useEffect(() => {
    if (!data || !host.current) return;
    let live = true;
    setError(null);
    setSurfaceReady(false);
    import("3dmol").then(($3Dmol) => {
      if (!live || !host.current) return;
      const v = viewer.current ?? $3Dmol.createViewer(host.current, { backgroundColor: paper.current });
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
      v.setStyle({}, { cartoon: { color: "spectrum", style: style === "backbone" ? "trace" : "rectangle" } });
      if (style === "surface" && !surfaceEligible(v.selectedAtoms({}))) {
        setError("Use Ribbon or Backbone for this structure's size.");
      } else if (style === "surface") {
        $3Dmol.setSyncSurface(true);
        void v.addSurface($3Dmol.SurfaceType.VDW, { opacity: 0.7, color: "#C9B27A" }).then(
          () => live && setSurfaceReady(true),
          () => live && setError("The protein surface could not be drawn."),
        );
      }
      const ids = data.name === protein.pdb ? protein.residues : [];
      for (const r of ids) {
        const on = focus && focus.chain === r.chain && focus.resi === r.resi;
        v.addStyle({ chain: r.chain, resi: r.resi }, { stick: { color: on ? "#E0A33A" : "#8E3E3E", radius: on ? 0.35 : 0.2 } });
      }
      v.zoomTo(focus && data.name === protein.pdb ? { chain: focus.chain, resi: focus.resi } : undefined);
      if (focus && data.name === protein.pdb) v.zoom(0.35);
      v.render();
    }, () => live && setError(PROTEIN_OFFLINE));
    return () => {
      live = false;
    };
  }, [data, style, focus, protein]);

  useEffect(() => {
    viewer.current?.setBackgroundColor(theme.paper, 1).render();
  }, [theme.paper]);

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
        {(["cartoon", "backbone", "surface"] as Style[]).map((s) => (
          <button key={s} data-testid={`protein-style-${s}`} aria-pressed={s === style} className="border hairline px-3 py-1" style={{ background: s === style ? "var(--gold, #D9A43A)" : undefined }} onClick={() => setStyle(s)}>
            {s === "cartoon" ? "Ribbon" : s === "backbone" ? "Backbone" : "Surface"}
          </button>
        ))}
        <span style={{ color: "var(--parchment-dim)" }}>
          {summary ? `${data?.name} · ${summary.chains.join(",")} · ${summary.residues} residues` : "loading"} · files stay in this browser · {protein.credit}
        </span>
      </div>
      {error && <p role="alert" className="mt-2 text-sm">{error}</p>}
      <div data-testid="explore-scene" data-protein-style={style} data-surface-ready={surfaceReady} className="relative w-full h-[420px] md:h-[520px] border hairline mt-3" style={{ background: "var(--paper)" }}>
        <div ref={host} data-testid="protein-canvas" className="absolute inset-0" />
      </div>
    </div>
  );
}

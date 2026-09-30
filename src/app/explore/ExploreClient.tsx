"use client";

import nextDynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Hit, HitType } from "@/lib/explore/search";
import { MODES, modeById } from "@/lib/explore/modes";
import { SNPS, type GenomeSummary } from "@/lib/explore/genome/parse";
import DnaPanel from "@/components/explore/DnaPanel";
import { DEFAULT_Z, ELEMENTS, elementByZ } from "@/lib/explore/modes/atom";
import { PARTICLES } from "@/lib/explore/modes/particle";
import { MOLECULES, REACTIONS, loadSmiles, moleculeById, reactionById, smilesReady } from "@/lib/explore/modes/chem";
import { loadLandmask, type Landmask } from "@/components/canon-globe/landmaskFromImage";
import { proteinById, proteinHits, snpFor, type ResidueLink } from "@/lib/explore/protein";

const SceneHost = nextDynamic(() => import("@/components/explore/SceneHost"), { ssr: false });
const ProteinView = nextDynamic(() => import("@/components/explore/ProteinView"), { ssr: false });

const TYPES: { id: HitType; label: string }[] = [
  { id: "excerpt", label: "Excerpts" },
  { id: "advisor", label: "Advisors" },
  { id: "work", label: "Works" },
];

const mono = { fontFamily: "var(--font-jetbrains)" };

export default function ExploreClient() {
  const [q, setQ] = useState("light water mitochondria");
  const [types, setTypes] = useState<Set<HitType>>(new Set<HitType>(["excerpt", "advisor", "work"]));
  const [hits, setHits] = useState<Hit[]>([]);
  const [sample, setSample] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modeId, setModeId] = useState<string>("globe");
  const [scroll, setScroll] = useState(0);
  const [genome, setGenome] = useState<GenomeSummary | null>(null);
  const [geneHits, setGeneHits] = useState<Hit[]>([]);
  const [element, setElement] = useState(DEFAULT_Z);
  const [molecule, setMolecule] = useState(MOLECULES[0].id);
  const [reaction, setReaction] = useState(REACTIONS[0].id);
  const [smilesLoaded, setSmilesLoaded] = useState(smilesReady());
  const [focus, setFocus] = useState<ResidueLink | null>(null);
  const [matterHits, setMatterHits] = useState<Hit[]>([]);
  const [landmask, setLandmask] = useState<Landmask | null>(null);

  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get("mode");
    if (m) setModeId(modeById(m).id);
  }, []);

  const pickMode = (id: string) => {
    setModeId(id);
    setScroll(0);
    const u = new URL(window.location.href);
    u.searchParams.set("mode", id);
    window.history.replaceState(null, "", u.toString());
  };

  const run = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/explore/search?q=${encodeURIComponent(query)}&top_k=60`);
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message || `search failed: ${res.status}`);
      setHits(body.results);
      setSample(!!body.advisors_sample);
      setSelected(body.results[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setHits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    run(q);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => hits.filter((h) => types.has(h.type)), [hits, types]);
  const byId = useMemo(() => new Map(hits.map((h) => [h.id, h])), [hits]);
  const current = selected ? byId.get(selected) ?? null : null;
  const mode = modeById(modeId);
  const protein = proteinById(null);

  useEffect(() => {
    if (mode.id !== "dna" || geneHits.length) return;
    const genes = Array.from(new Set(SNPS.map((s) => s.gene))).join(" ");
    fetch(`/api/explore/search?q=${encodeURIComponent(genes)}&types=excerpt&top_k=40`)
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((b) => setGeneHits(b.results ?? []))
      .catch(() => setGeneHits([]));
  }, [mode.id, geneHits.length]);

  useEffect(() => {
    if ((mode.id !== "molecule" && mode.id !== "reaction") || smilesLoaded) return;
    loadSmiles().then(() => setSmilesLoaded(true));
  }, [mode.id, smilesLoaded]);

  const matterQuery = mode.id === "atom" ? `${elementByZ(element).name} ${elementByZ(element).symbol}` : mode.id === "particle" ? PARTICLES.map((p) => p.name).join(" ") : mode.id === "molecule" ? moleculeById(molecule).name : mode.id === "reaction" ? `${reactionById(reaction).name} chemistry` : mode.id === "protein" ? `${proteinById(null).gene} ${proteinById(null).name}` : null;

  useEffect(() => {
    if (!matterQuery) return;
    let live = true;
    fetch(`/api/explore/search?q=${encodeURIComponent(matterQuery)}&types=excerpt&top_k=40`)
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((b) => live && setMatterHits(b.results ?? []))
      .catch(() => live && setMatterHits([]));
    return () => {
      live = false;
    };
  }, [matterQuery]);

  useEffect(() => {
    if (mode.id !== "earth" || landmask) return;
    loadLandmask("/textures/earth/landmask-2k.bin").then(setLandmask, () => setLandmask(null));
  }, [mode.id, landmask]);

  const extraHits = mode.id === "dna" ? geneHits : matterQuery ? matterHits : undefined;
  const layout = useMemo(
    () => mode.layout(visible, { selected, scroll, genome, extraHits, element, molecule, reaction, landmask }),
    [mode, visible, selected, scroll, genome, extraHits, element, molecule, reaction, smilesLoaded, landmask],
  );
  const selectedNode = selected && !current ? layout.nodes.find((n) => n.id === selected) ?? null : null;

  const toggle = (t: HitType) =>
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  return (
    <main className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-10 pb-16">
        <p className="mb-3 text-xs uppercase tracking-[0.22em]" style={{ color: "var(--parchment-dim)", ...mono }}>
          Explore
        </p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(q);
          }}
        >
          <input
            aria-label="Search"
            data-testid="explore-query"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 border hairline bg-transparent px-3 py-2"
            placeholder="Search canon excerpts and advisors"
          />
          <button type="submit" className="border hairline px-4 py-2" style={mono}>
            {loading ? "…" : "Search"}
          </button>
        </form>
        <div className="flex flex-wrap gap-3 mt-3 text-sm" style={mono}>
          {TYPES.map((t) => (
            <label key={t.id} className="flex items-center gap-1">
              <input type="checkbox" checked={types.has(t.id)} onChange={() => toggle(t.id)} />
              {t.label} ({hits.filter((h) => h.type === t.id).length})
            </label>
          ))}
          {sample && <span style={{ color: "var(--parchment-dim)" }}>advisors: sample data</span>}
        </div>
        {error && <p className="mt-4 text-sm" role="alert">{error}</p>}
        <div role="tablist" aria-label="Mode" className="flex flex-wrap gap-2 mt-6 text-sm" style={mono}>
          {MODES.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={m.id === mode.id}
              data-testid={`mode-${m.id}`}
              onClick={() => pickMode(m.id)}
              className="border hairline px-3 py-1"
              style={{ background: m.id === mode.id ? "var(--gold, #D9A43A)" : undefined }}
            >
              {m.label}
            </button>
          ))}
        </div>
        {mode.id === "dna" && <DnaPanel genome={genome} onGenome={setGenome} />}
        {mode.id === "atom" && (
          <label className="flex items-center gap-2 mt-3 text-sm" style={mono}>
            Element
            <select data-testid="atom-element" value={element} onChange={(e) => setElement(Number(e.target.value))} className="border hairline bg-transparent px-2 py-1">
              {ELEMENTS.map((el) => (
                <option key={el.z} value={el.z}>
                  {el.z} {el.symbol} {el.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {(mode.id === "molecule" || mode.id === "reaction") && (
          <label className="flex items-center gap-2 mt-3 text-sm" style={mono}>
            {mode.id === "molecule" ? "Molecule" : "Reaction"}
            <select
              data-testid="chem-select"
              value={mode.id === "molecule" ? molecule : reaction}
              onChange={(e) => (mode.id === "molecule" ? setMolecule(e.target.value) : setReaction(e.target.value))}
              className="border hairline bg-transparent px-2 py-1"
            >
              {(mode.id === "molecule" ? MOLECULES : REACTIONS).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="mt-3">
          {mode.renderer === "protein" ? (
            <ProteinView protein={protein} focus={focus} onFocus={setFocus} />
          ) : (
            <SceneHost key={mode.id} layout={layout} selected={selected} onSelect={setSelected} onScroll={(d) => setScroll((s) => s + d)} />
          )}
          {mode.renderer === "protein" && (
            <div data-testid="protein-links" className="mt-3 text-sm space-y-2">
              <ul className="space-y-1">
                {protein.residues.map((r) => {
                  const snp = snpFor(r);
                  return (
                    <li key={`${r.chain}${r.resi}`} className="flex flex-wrap items-center gap-2">
                      <button className="border hairline px-2 py-1" style={mono} onClick={() => setFocus(r)}>
                        {r.chain}:{r.resi}
                      </button>
                      <span>{r.note}</span>
                      <button className="underline" style={mono} onClick={() => pickMode("dna")}>
                        {snp ? `${snp.gene} ${snp.rsid} in DNA mode` : `${r.rsid} in DNA mode`}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <ul className="space-y-1">
                {proteinHits(protein, [...matterHits, ...visible]).slice(0, 6).map((h) => (
                  <li key={h.id}>
                    <button className="underline text-left" onClick={() => setSelected(h.id)}>
                      {h.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ul className="flex flex-wrap gap-3 mt-2 text-xs" style={mono}>
            {layout.legend.map((l) => (
              <li key={l.label} className="flex items-center gap-1">
                <span style={{ width: 10, height: 10, borderRadius: 5, background: l.color, display: "inline-block" }} />
                {l.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid md:grid-cols-[1fr_320px] gap-6 mt-6">
          <ol data-testid="explore-results" className="space-y-2">
            {visible.map((h) => (
              <li key={h.id}>
                <button
                  onClick={() => setSelected(h.id)}
                  className="w-full text-left border hairline px-3 py-2"
                  style={{ outline: h.id === selected ? "1px solid var(--gold, #D9A43A)" : undefined }}
                >
                  <span className="text-xs uppercase" style={{ ...mono, color: "var(--parchment-dim)" }}>
                    {h.type} · {h.score.toFixed(2)}
                  </span>
                  <span className="block">{h.title}</span>
                  <span className="block text-sm" style={{ color: "var(--parchment-dim)" }}>{h.subtitle}</span>
                </button>
              </li>
            ))}
            {!loading && !visible.length && !error && <li className="text-sm">No results.</li>}
          </ol>
          <aside data-testid="explore-panel" className="border hairline p-4 self-start md:sticky md:top-4">
            {current ? (
              <>
                <p className="text-xs uppercase" style={{ ...mono, color: "var(--parchment-dim)" }}>{current.type}</p>
                <h2 className="text-lg mt-1">{current.title}</h2>
                <p className="text-sm mt-1" style={{ color: "var(--parchment-dim)" }}>{current.subtitle}</p>
                {current.text && <p className="text-sm mt-3">{current.text}</p>}
                {current.url && (
                  <a className="text-sm underline mt-3 inline-block" href={current.url}>
                    Open
                  </a>
                )}
                {current.links.length > 0 && (
                  <>
                    <p className="text-xs uppercase mt-4" style={{ ...mono, color: "var(--parchment-dim)" }}>
                      {current.type === "advisor" ? "Nearest excerpts" : current.type === "work" ? "Excerpts" : "Nearest advisors"}
                    </p>
                    <ul className="mt-1 space-y-1 text-sm">
                      {current.links.map((id) => {
                        const l = byId.get(id);
                        return (
                          <li key={id}>
                            <button className="underline text-left" onClick={() => setSelected(id)}>
                              {l?.title ?? id}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </>
            ) : selectedNode ? (
              <>
                <p className="text-xs uppercase" style={{ ...mono, color: "var(--parchment-dim)" }}>{selectedNode.id.split(":")[0]}</p>
                <p className="mt-1">{selectedNode.label ?? selectedNode.id}</p>
              </>
            ) : (
              <p className="text-sm">Select a result.</p>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

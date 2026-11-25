"use client";

import { useEffect, useState } from "react";
import { type Kit, type Logo, type Palette } from "../BrandLab";

const PAGES = ["/", "/about", "/mission", "/canon", "/research-os", "/governance"];

type Auto = Palette & { logo: string; score: number };

function logosFor(id: string, logos: Logo[], dial: string[]): Logo[] {
  if (id.startsWith("omega-")) {
    const style = id.slice(6);
    return dial.filter((src) => src.startsWith(`v/${style}/`)).map((src) => ({ src: `/brand/omega-dial/${src}`, label: src, group: "omega" }));
  }
  const own = logos.filter((l) => l.label.startsWith(`${id}-`) && !l.label.endsWith("construction"));
  return own.length ? own : logos.filter((l) => l.group === "current");
}

export default function Gallery({ kit, palettes, auto, logos }: { kit: Kit; palettes: Palette[]; auto: Auto[]; logos: Logo[] }) {
  const [mode, setMode] = useState<"omega" | "directions">("omega");
  const [count, setCount] = useState(12);
  const [dial, setDial] = useState<string[]>([]);
  useEffect(() => {
    fetch("/brand/omega-dial/data.json").then((r) => (r.ok ? r.json() : [])).then((d: { src: string }[]) => setDial(d.map((x) => x.src).filter((x) => x.endsWith(".svg")))).catch(() => setDial([]));
  }, []);
  const list: (Palette & { logo?: string; score?: number })[] = mode === "omega" ? auto.slice(0, count) : palettes;
  const [pick, setPick] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [page, setPage] = useState("/");

  const save = async (p: Palette, logo: string) => {
    setStatus(`saving ${p.name}`);
    const draft: Kit = { ...kit, source: `${p.name} with ${logo.split("/").pop()}`, light: { ...kit.light, ...p.colors }, fonts: p.fonts };
    const r = await fetch("/api/brand/kit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kit: draft, logoSrc: logo }) });
    setStatus(r.ok ? `${p.name} saved to the site` : `error ${(await r.json()).error}`);
  };

  return (
    <main className="min-h-screen bg-white text-black p-6" style={{ fontFamily: "system-ui, sans-serif" }}>
      <div className="flex items-center gap-4 mb-6 sticky top-0 bg-white z-10 py-3 border-b">
        <h1 className="text-2xl font-bold">Brand Gallery</h1>
        <a href="/brand/lab" className="text-sm underline">Lab</a>
        <div className="flex gap-2 ml-6">
          <button onClick={() => setMode("omega")} className={`px-3 py-1 rounded border text-sm ${mode === "omega" ? "bg-black text-white" : ""}`}>Omega, ranked</button>
          <button onClick={() => setMode("directions")} className={`px-3 py-1 rounded border text-sm ${mode === "directions" ? "bg-black text-white" : ""}`}>Directions</button>
        </div>
        <div className="flex gap-2 ml-6">
          {PAGES.map((p) => (
            <button key={p} onClick={() => setPage(p)} className={`px-3 py-1 rounded border text-sm ${page === p ? "bg-black text-white" : ""}`}>{p}</button>
          ))}
        </div>
        <span className="text-sm ml-auto">{status}</span>
      </div>
      <div className="grid xl:grid-cols-2 gap-10">
        {list.map((p, rank) => {
          const own = logosFor(p.id, logos, dial);
          const logo = pick[p.id] ?? p.logo ?? own.find((l) => /mho|omega|mark|current/.test(l.label))?.src ?? own[0]?.src ?? kit.logo;
          const url = `${page}?brand=${p.id}&logo=${encodeURIComponent(logo)}`;
          return (
            <section key={p.id}>
              <link rel="stylesheet" href={p.fonts.href} />
              <div className="flex items-baseline gap-3 mb-2">
                <h2 className="text-xl font-bold">{p.score !== undefined ? `${rank + 1}. ` : ""}{p.name}</h2>
                {p.score !== undefined && <span className="text-xs font-mono">score {p.score}</span>}
                <span className="text-xs text-gray-600">{p.source}</span>
                <button onClick={() => save(p, logo)} className="ml-auto px-3 py-1 rounded bg-black text-white text-sm">Use on site</button>
              </div>
              <div className="relative w-full overflow-hidden rounded-lg border border-black/20" style={{ aspectRatio: "1280 / 900" }}>
                <iframe key={url} src={url} title={`${p.name} ${page}`} loading="lazy" className="absolute top-0 left-0 origin-top-left border-0" style={{ width: 1280, height: 900, transform: "scale(var(--s))" }} ref={(el) => { if (el?.parentElement) el.style.setProperty("--s", String(el.parentElement.clientWidth / 1280)); }} />
              </div>
              <a href={url} target="_blank" rel="noreferrer" className="text-xs underline">open full page</a>
              <div className="flex flex-wrap gap-2 mt-3">
                {own.map((l) => (
                  <button key={l.src} onClick={() => setPick((s) => ({ ...s, [p.id]: l.src }))} title={l.label} style={{ background: p.colors.bg }} className={`p-1 rounded border ${logo === l.src ? "ring-4 ring-black" : ""}`}>
                    <img src={l.src} alt={l.label} className="w-14 h-14 object-contain" loading="lazy" />
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      {mode === "omega" && count < auto.length && (
        <button onClick={() => setCount((c) => c + 12)} className="mt-8 px-4 py-2 border rounded">Show 12 more of {auto.length}</button>
      )}
    </main>
  );
}

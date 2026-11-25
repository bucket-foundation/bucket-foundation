"use client";

import { useState } from "react";
import { Preview, type Kit, type Logo, type Palette } from "../BrandLab";

function logosFor(id: string, logos: Logo[]): Logo[] {
  const own = logos.filter((l) => l.label.startsWith(`${id}-`) && !l.label.endsWith("construction"));
  return own.length ? own : logos.filter((l) => l.group === "current");
}

export default function Gallery({ kit, palettes, logos }: { kit: Kit; palettes: Palette[]; logos: Logo[] }) {
  const [pick, setPick] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");

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
        <span className="text-sm ml-auto">{status}</span>
      </div>
      <div className="grid xl:grid-cols-2 gap-10">
        {palettes.map((p) => {
          const own = logosFor(p.id, logos);
          const logo = pick[p.id] ?? own.find((l) => /mho|omega|mark|current/.test(l.label))?.src ?? own[0].src;
          const draft: Kit = { ...kit, light: { ...kit.light, ...p.colors }, fonts: p.fonts };
          return (
            <section key={p.id}>
              <link rel="stylesheet" href={p.fonts.href} />
              <div className="flex items-baseline gap-3 mb-2">
                <h2 className="text-xl font-bold">{p.name}</h2>
                <span className="text-xs text-gray-600">{p.source}</span>
                <button onClick={() => save(p, logo)} className="ml-auto px-3 py-1 rounded bg-black text-white text-sm">Use on site</button>
              </div>
              <Preview draft={draft} logo={logo} />
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
    </main>
  );
}

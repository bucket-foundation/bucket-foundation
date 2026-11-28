"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

type Colors = Record<string, string>;
type Fonts = Record<string, string>;
export type Kit = { source: string; logo: string; fonts: Fonts; shape: Record<string, string>; light: Colors; dark: Colors };
export type Palette = { id: string; name: string; source: string; colors: Colors; fonts: Fonts };
export type Logo = { src: string; label: string; group: string };
type DialItem = { kind: string; src: string; label: string; cat: string; meta: string };

const SWATCH = ["bg", "surface", "text", "muted", "accent", "on-accent", "link", "danger", "success"];
const FONT_ROLES = ["display", "body", "mono"] as const;
const PAGE = 120;

function vars(colors: Colors, fonts: Fonts, shape: Record<string, string>): CSSProperties {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(colors)) out[`--bk-${k}`] = v;
  for (const [k, v] of Object.entries(fonts)) if (k !== "href") out[`--bk-font-${k}`] = v;
  for (const [k, v] of Object.entries(shape)) out[`--bk-${k}`] = v;
  return out as CSSProperties;
}

export function Preview({ draft, logo }: { draft: Kit; logo: string }) {
  return (
    <div style={{ ...vars(draft.light, draft.fonts, draft.shape), background: "var(--bk-bg)", color: "var(--bk-text)", fontFamily: "var(--bk-font-body)" }} className="rounded-lg overflow-hidden border border-black/20">
      <div style={{ borderBottom: "1px solid var(--bk-line)" }} className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          <img src={logo} alt="" width={36} height={36} />
          <span style={{ fontFamily: "var(--bk-font-display)" }} className="font-bold tracking-wide">BUCKET.FOUNDATION</span>
        </div>
        <span style={{ fontFamily: "var(--bk-font-mono)", color: "var(--bk-muted)" }} className="text-xs">RESEARCH OS · CANON · ABOUT</span>
      </div>
      <div className="px-8 py-12 text-center">
        <div style={{ fontFamily: "var(--bk-font-mono)", color: "var(--bk-accent-text)" }} className="text-xs tracking-[0.2em] mb-4">BUCKET FOUNDATION · NONPROFIT</div>
        <div style={{ fontFamily: "var(--bk-font-display)" }} className="text-5xl font-bold leading-none">
          REFORM <span style={{ color: "var(--bk-accent-text)" }}>EDUCATION.</span>
        </div>
        <p style={{ color: "var(--bk-text-2)" }} className="mt-5 text-lg">Learn the foundations of science, from first lesson to the research frontier.</p>
        <div className="mt-8 flex justify-center gap-3">
          <span style={{ background: "var(--bk-accent)", color: "var(--bk-on-accent)", borderRadius: "var(--bk-radius)" }} className="px-6 py-3 font-semibold">Start learning</span>
          <span style={{ color: "var(--bk-link)", borderRadius: "var(--bk-radius)", border: "1px solid var(--bk-line-strong)" }} className="px-6 py-3">Research OS</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 px-6 pb-8">
        {["Mathematics", "Physics", "Mind"].map((b) => (
          <div key={b} style={{ background: "var(--bk-surface)", border: "1px solid var(--bk-line)", borderRadius: "var(--bk-radius-lg)" }} className="p-4">
            <div style={{ fontFamily: "var(--bk-font-display)" }} className="font-bold">{b}</div>
            <div style={{ color: "var(--bk-muted)" }} className="text-sm mt-1">Axioms and laws, free to read.</div>
            <div style={{ fontFamily: "var(--bk-font-mono)", color: "var(--bk-success)" }} className="text-xs mt-2">live</div>
          </div>
        ))}
      </div>
      <div style={{ background: "var(--bk-text)", color: "var(--bk-bg)", fontFamily: "var(--bk-font-mono)" }} className="px-6 py-4 text-xs flex justify-between">
        <span>bucket foundation · nonprofit</span>
        <span style={{ color: "var(--bk-accent-bright)" }}>carved in stone · mmxxii</span>
      </div>
    </div>
  );
}

export default function BrandLab({ kit, palettes, logos }: { kit: Kit; palettes: Palette[]; logos: Logo[] }) {
  const [draft, setDraft] = useState<Kit>(kit);
  const [role, setRole] = useState<string | null>(null);
  const [logo, setLogo] = useState(kit.logo);
  const [dial, setDial] = useState<DialItem[]>([]);
  const [cat, setCat] = useState("styles");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/brand/omega-dial/data.json").then((r) => (r.ok ? r.json() : [])).then((d: DialItem[]) => setDial(d.filter((x) => x.src.endsWith(".svg")))).catch(() => setDial([]));
  }, []);

  const cats = useMemo(() => Array.from(new Set(dial.map((d) => d.cat))).sort(), [dial]);
  const shown = useMemo(() => dial.filter((d) => (!cat || d.cat === cat) && (!q || `${d.label} ${d.meta}`.toLowerCase().includes(q.toLowerCase()))), [dial, cat, q]);

  const setColor = (k: string, v: string) => setDraft((d) => ({ ...d, light: { ...d.light, [k]: v } }));
  const applyColors = (p: Palette) => setDraft((d) => ({ ...d, light: { ...d.light, ...p.colors }, source: `${d.source.split(" + ")[0]} + colors:${p.id}` }));
  const applyFont = (p: Palette, r: (typeof FONT_ROLES)[number]) =>
    setDraft((d) => {
      const fonts = { ...d.fonts, [r]: p.fonts[r], ...(r === "display" ? { accent: p.fonts.accent } : {}) };
      const hrefs = new Set([d.fonts.href, p.fonts.href]);
      const families = Array.from(hrefs).flatMap((h) => (h.split("?")[1] ?? "").split("&").filter((x) => x.startsWith("family=")));
      return { ...d, fonts: { ...fonts, href: `https://fonts.googleapis.com/css2?${Array.from(new Set(families)).join("&")}&display=swap` } };
    });

  const save = async () => {
    setStatus("saving");
    const r = await fetch("/api/brand/kit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kit: draft, logoSrc: logo }) });
    setStatus(r.ok ? "saved to brand/bucket/kit.json, the site now uses it" : `error ${(await r.json()).error}`);
  };

  return (
    <main className="min-h-screen bg-white text-black p-6 font-sans" style={{ fontFamily: "system-ui, sans-serif" }}>
      <link rel="stylesheet" href={draft.fonts.href} />
      <div className="flex flex-wrap items-center gap-4 mb-6 sticky top-0 bg-white z-10 py-3 border-b">
        <h1 className="text-2xl font-bold">Brand Lab</h1>
        <a href="/brand/lab/gallery" className="text-sm underline">Gallery</a>
        <span className="text-sm text-gray-600">{draft.source}</span>
        <button onClick={() => { setDraft(kit); setLogo(kit.logo); }} className="ml-auto px-4 py-2 border rounded">Reset</button>
        <button onClick={save} className="px-4 py-2 rounded bg-black text-white">Save to site</button>
        <span className="text-sm">{status}</span>
      </div>

      <div className="grid lg:grid-cols-[1fr_420px] gap-8">
        <section>
          <Preview draft={draft} logo={logo} />

          <h2 className="text-xl font-bold mt-10 mb-3">Palettes and type</h2>
          <p className="text-sm text-gray-600 mb-4">Use colors or one typeface from any direction to cross them. Pick a role on the right, then click any swatch to set just that role.</p>
          <div className="grid md:grid-cols-2 gap-4">
            {palettes.map((p) => (
              <div key={p.id} className="border rounded p-4">
                <div className="font-bold">{p.name} <span className="text-xs text-gray-500">{p.id}</span></div>
                <div className="text-xs text-gray-600 mb-3">{p.source}</div>
                <div className="flex gap-1 mb-3">
                  {SWATCH.map((k) => (
                    <button key={k} title={`${k} ${p.colors[k]}`} onClick={() => role && setColor(role, p.colors[k])} className="w-9 h-9 rounded border border-black/20" style={{ background: p.colors[k] }} />
                  ))}
                </div>
                <link rel="stylesheet" href={p.fonts.href} />
                <div style={{ fontFamily: p.fonts.display }} className="text-2xl font-bold">Reform education</div>
                <div style={{ fontFamily: p.fonts.body }} className="text-sm">Free to read, paid once to cite.</div>
                <div className="flex flex-wrap gap-2 mt-3 text-xs">
                  <button onClick={() => applyColors(p)} className="px-2 py-1 border rounded">Use colors</button>
                  {FONT_ROLES.map((r) => (
                    <button key={r} onClick={() => applyFont(p, r)} className="px-2 py-1 border rounded">Use {r} font</button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <h2 className="text-xl font-bold mt-10 mb-3">Logos</h2>
          <div className="grid grid-cols-6 md:grid-cols-10 gap-2">
            {logos.map((l) => (
              <button key={l.src} onClick={() => setLogo(l.src)} title={l.label} className={`p-1 border rounded ${logo === l.src ? "ring-4 ring-black" : ""}`}>
                <img src={l.src} alt={l.label} className="w-full aspect-square object-contain" loading="lazy" />
              </button>
            ))}
          </div>
          {dial.length > 0 && (
            <>
              <h3 className="font-bold mt-6 mb-2">Omega dial</h3>
              <div className="text-xs text-gray-600 mb-2">{shown.length} of {dial.length}</div>
              <div className="flex flex-wrap gap-2 mb-3">
                <select value={cat} onChange={(e) => { setCat(e.target.value); setPage(0); }} className="border rounded px-2 py-1">
                  <option value="">all</option>
                  {cats.map((c) => <option key={c}>{c}</option>)}
                </select>
                <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="search" className="border rounded px-2 py-1" />
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} className="border rounded px-2">prev</button>
                <span className="text-sm">page {page + 1} of {Math.max(1, Math.ceil(shown.length / PAGE))}</span>
                <button onClick={() => setPage((p) => p + 1)} className="border rounded px-2">next</button>
              </div>
              <div className="grid grid-cols-8 md:grid-cols-12 gap-2">
                {shown.slice(page * PAGE, (page + 1) * PAGE).map((d) => {
                  const src = `/brand/omega-dial/${d.src}`;
                  return (
                    <button key={d.src} onClick={() => setLogo(src)} title={`${d.label} · ${d.meta}`} className={`p-1 border rounded ${logo === src ? "ring-4 ring-black" : ""}`}>
                      <img src={src} alt={d.label} className="w-full aspect-square object-contain" loading="lazy" />
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <aside className="lg:sticky lg:top-20 self-start">
          <h2 className="text-xl font-bold mb-3">Roles</h2>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {Object.entries(draft.light).map(([k, v]) => (
              <div key={k} className={`flex items-center gap-2 p-1 rounded cursor-pointer ${role === k ? "bg-black text-white" : ""}`} onClick={() => setRole(k)}>
                <input type="color" value={v.startsWith("#") ? v.slice(0, 7) : "#000000"} onChange={(e) => setColor(k, e.target.value.toUpperCase())} className="w-6 h-6" />
                <span className="truncate">{k}</span>
                <span className="ml-auto opacity-60">{v.startsWith("#") ? v : "rgba"}</span>
              </div>
            ))}
          </div>
          <h2 className="text-xl font-bold mt-6 mb-2">Type</h2>
          {FONT_ROLES.map((r) => (
            <div key={r} className="text-xs mb-1"><b>{r}</b> {draft.fonts[r]}</div>
          ))}
          <h2 className="text-xl font-bold mt-6 mb-2">Logo</h2>
          <img src={logo} alt="" className="w-24 h-24 object-contain border rounded" />
          <div className="text-xs break-all mt-1">{logo}</div>
        </aside>
      </div>
    </main>
  );
}

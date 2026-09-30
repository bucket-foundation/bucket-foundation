"use client";

import { useMemo, useState } from "react";
import {
  filterTools,
  firstPathCounts,
  MEMO_URL,
  NO_FILTER,
  PATHS,
  PATH_HINT,
  type AtlasPath,
  type AtlasTool,
  type Segment,
  type SoftwareAtlasData,
  type ToolFilter,
} from "@/lib/research-os/software-atlas";

type Tab = "tools" | "suite" | "viewers" | "directions";

const TABS: { id: Tab; label: string }[] = [
  { id: "tools", label: "tools" },
  { id: "suite", label: "research tools" },
  { id: "viewers", label: "viewers" },
  { id: "directions", label: "directions" },
];

const LABEL = "small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]";
const INPUT = "w-full border border-[color:var(--hairline)] px-3 py-2 text-[14px] bg-white/70 text-[color:var(--basalt)] focus:outline-none focus:border-[color:var(--gold-deep)] min-h-[44px]";

const PATH_STYLE: Record<AtlasPath, string> = {
  browser: "border-[color:var(--aegean-deep)] text-[color:var(--aegean-deep)]",
  runner: "border-[color:var(--laurel-deep)] text-[color:var(--laurel-deep)]",
  import: "border-[color:var(--gold-deep)] text-[color:var(--gold-deep)]",
  link: "border-[color:var(--basalt-3)] text-[color:var(--basalt-2)]",
};

function Rich({ segs }: { segs: Segment[] }) {
  return (
    <>
      {segs.map((s, i) =>
        s.t === "code" ? (
          <code key={i} className="font-mono text-[12px] bg-[color:var(--bone-2)] px-1 break-words">
            {s.v}
          </code>
        ) : s.t === "link" ? (
          <a key={i} href={s.href} target="_blank" rel="noreferrer" className="underline underline-offset-4 break-words">
            {s.v}
          </a>
        ) : (
          <span key={i}>{s.v}</span>
        ),
      )}
    </>
  );
}

function PathChip({ path, weak = false }: { path: AtlasPath; weak?: boolean }) {
  return (
    <span
      title={PATH_HINT[path]}
      className={`inline-flex items-center border px-2 py-[2px] text-[11px] small-caps tracking-[0.12em] ${PATH_STYLE[path]} ${weak ? "opacity-70 border-dashed" : ""}`}
    >
      {path}
    </span>
  );
}

function ToolCard({ t }: { t: AtlasTool }) {
  return (
    <li className="border-b border-[color:var(--hairline)]">
      <details className="group">
        <summary className="cursor-pointer list-none py-3 flex flex-wrap items-center gap-x-3 gap-y-2 min-h-[44px]">
          <span className="text-[15px] text-[color:var(--basalt)] mr-auto">
            {t.name}
            <span className="ml-2 text-[12px] text-[color:var(--basalt-3)]">{t.field}</span>
          </span>
          <span className="flex items-center gap-2 w-full md:w-auto">
            <span className={`text-[11px] small-caps tracking-[0.12em] min-w-[52px] ${t.open ? "text-[color:var(--laurel-deep)]" : "text-[color:var(--crimson)]"}`}>
              {t.open ? "open" : "closed"}
            </span>
            <PathChip path={t.first} />
            {t.fallback && <PathChip path={t.fallback} weak />}
          </span>
        </summary>
        <dl className="pb-4 grid gap-3 text-[13px] leading-relaxed text-[color:var(--basalt-2)] md:grid-cols-[140px_1fr]">
          <dt className={LABEL + " md:pt-[3px]"}>license</dt>
          <dd><Rich segs={t.license} /></dd>
          <dt className={LABEL + " md:pt-[3px]"}>renders</dt>
          <dd><Rich segs={t.renders} /></dd>
          <dt className={LABEL + " md:pt-[3px]"}>formats</dt>
          <dd><Rich segs={t.formats} /></dd>
          <dt className={LABEL + " md:pt-[3px]"}>how it connects</dt>
          <dd><Rich segs={t.connects} /></dd>
          <dt className={LABEL + " md:pt-[3px]"}>research os shows</dt>
          <dd><Rich segs={t.shows} /></dd>
          {t.sources.length > 0 && (
            <>
              <dt className={LABEL + " md:pt-[3px]"}>sources</dt>
              <dd>
                <ol className="space-y-1">
                  {t.sources.map((s) => (
                    <li key={s.n} className="break-words">
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                          {s.title}
                        </a>
                      ) : (
                        s.title
                      )}
                    </li>
                  ))}
                </ol>
              </dd>
            </>
          )}
        </dl>
      </details>
    </li>
  );
}

function ToolsTab({ data }: { data: SoftwareAtlasData }) {
  const [f, setF] = useState<ToolFilter>(NO_FILTER);
  const shown = useMemo(() => filterTools(data.tools, f), [data.tools, f]);
  const counts = useMemo(() => firstPathCounts(data.tools), [data.tools]);
  const intro = f.field ? data.fields.find((x) => x.name === f.field)?.intro : null;

  return (
    <section>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {PATHS.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={f.path === p}
            onClick={() => setF({ ...f, path: f.path === p ? null : p })}
            className={`text-left border px-3 py-2 min-h-[44px] ${f.path === p ? "border-[color:var(--gold-deep)] bg-white/60" : "border-[color:var(--hairline)]"}`}
          >
            <span className="font-display text-[22px] leading-none mr-2 text-[color:var(--basalt)]">{counts[p]}</span>
            <PathChip path={p} />
            <span className="block mt-1 text-[11px] text-[color:var(--basalt-3)]">first path · {PATH_HINT[p]}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-[1fr_220px_160px]">
        <label className="sr-only" htmlFor="atlas-q">search tools</label>
        <input id="atlas-q" className={INPUT} placeholder="search a tool, a format, a license" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        <label className="sr-only" htmlFor="atlas-field">field</label>
        <select id="atlas-field" className={INPUT} value={f.field ?? ""} onChange={(e) => setF({ ...f, field: e.target.value || null })}>
          <option value="">every field</option>
          {data.fields.map((x) => (
            <option key={x.name} value={x.name}>
              {x.name}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="atlas-license">license</label>
        <select id="atlas-license" className={INPUT} value={f.license} onChange={(e) => setF({ ...f, license: e.target.value as ToolFilter["license"] })}>
          <option value="any">open and closed</option>
          <option value="open">open</option>
          <option value="closed">closed</option>
        </select>
      </div>

      <p className="mt-3 text-[12px] text-[color:var(--basalt-3)]" aria-live="polite">
        {shown.length} of {data.tools.length} tools
        {f.path ? `, reached by ${f.path}` : ""}
        {(f.q || f.field || f.path || f.license !== "any") && (
          <button type="button" onClick={() => setF(NO_FILTER)} className="ml-3 underline underline-offset-4">
            clear
          </button>
        )}
      </p>
      {intro && <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--basalt-2)] max-w-[72ch]">{intro}</p>}

      <ul className="mt-3 border-t border-[color:var(--hairline)]">
        {shown.map((t) => (
          <ToolCard key={t.name} t={t} />
        ))}
      </ul>
      {shown.length === 0 && <p className="mt-6 text-[13px] text-[color:var(--basalt-2)]">No tool matches. Clear a filter.</p>}
    </section>
  );
}

function SuiteTab({ data }: { data: SoftwareAtlasData }) {
  const [browserOnly, setBrowserOnly] = useState(false);
  const inBrowser = data.suite.filter((s) => s.inBrowser).length;
  const groups = Array.from(new Set(data.suite.map((s) => s.group)));
  return (
    <section>
      <p className="text-[13px] leading-relaxed text-[color:var(--basalt-2)] max-w-[72ch]">
        The forty tools under Research tools run on one gateway host. {inBrowser} of them ran in Pyodide on 2026-09-21 with the gateway&apos;s own inputs, so a browser path can keep them working when that host is down.
      </p>
      <label className="mt-3 inline-flex items-center gap-2 text-[13px] text-[color:var(--basalt-2)] min-h-[44px]">
        <input type="checkbox" checked={browserOnly} onChange={(e) => setBrowserOnly(e.target.checked)} />
        only the {inBrowser} that run in the browser
      </label>
      {groups.map((g) => {
        const rows = data.suite.filter((s) => s.group === g && (!browserOnly || s.inBrowser));
        if (rows.length === 0) return null;
        return (
          <div key={g} className="mt-5">
            <h3 className={LABEL}>{g}</h3>
            <ul className="mt-2 border-t border-[color:var(--hairline)]">
              {rows.map((s) => (
                <li key={s.name} className="border-b border-[color:var(--hairline)] py-3 text-[13px] leading-relaxed text-[color:var(--basalt-2)]">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-[15px] text-[color:var(--basalt)] mr-auto">{s.name}</span>
                    {s.inBrowser ? <PathChip path="browser" /> : <span className="text-[11px] small-caps tracking-[0.12em] text-[color:var(--basalt-3)]">server</span>}
                  </div>
                  <p className="mt-1"><Rich segs={s.does} /></p>
                  <p className="mt-1 text-[12px] text-[color:var(--basalt-3)]">
                    {s.inBrowser ? "Pyodide: " : "Stays on a server: "}
                    {s.pyodide.replace(/^server: /, "")}
                    {s.atlasRows && s.atlasRows !== "none" ? ` · meets ${s.atlasRows}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

function ViewersTab({ data }: { data: SoftwareAtlasData }) {
  return (
    <section>
      <p className="text-[13px] leading-relaxed text-[color:var(--basalt-2)] max-w-[72ch]">
        The pieces an import or a browser path embeds in the page. Each runs in the browser and serves several tools.
      </p>
      <ul className="mt-3 border-t border-[color:var(--hairline)]">
        {data.viewers.map((v) => (
          <li key={v.name} className="border-b border-[color:var(--hairline)] py-3 text-[13px] leading-relaxed text-[color:var(--basalt-2)]">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-[15px] text-[color:var(--basalt)]">{v.name}</span>
              <span className="text-[12px] text-[color:var(--basalt-3)]"><Rich segs={v.license} /></span>
            </div>
            <p className="mt-1"><span className={LABEL + " mr-2"}>reads</span><Rich segs={v.reads} /></p>
            <p className="mt-1"><span className={LABEL + " mr-2"}>serves</span><Rich segs={v.serves} /></p>
            <p className="mt-1 text-[12px] text-[color:var(--basalt-3)]">
              <Rich segs={v.latest} /> · maintained: <Rich segs={v.maintained} />
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DirectionsTab({ data }: { data: SoftwareAtlasData }) {
  return (
    <section className="max-w-[72ch]">
      <p className="text-[13px] leading-relaxed text-[color:var(--basalt-2)]">The order in which Research OS builds the four paths.</p>
      <ol className="mt-4 space-y-5">
        {data.directions.map((d) => (
          <li key={d.n} className="text-[13px] leading-relaxed text-[color:var(--basalt-2)]">
            <h3 className="text-[15px] text-[color:var(--basalt)]">
              {d.n}. {d.title}
            </h3>
            <p className="mt-1"><Rich segs={d.body} /></p>
          </li>
        ))}
      </ol>
      {data.unverified.length > 0 && (
        <details className="mt-8">
          <summary className={LABEL + " cursor-pointer min-h-[44px] flex items-center"}>unverified claims: {data.unverified.length}</summary>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-[13px] text-[color:var(--basalt-2)]">
            {data.unverified.map((u, i) => (
              <li key={i}><Rich segs={u} /></li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

export default function SoftwareAtlas({ data }: { data: SoftwareAtlasData }) {
  const [tab, setTab] = useState<Tab>("tools");
  return (
    <div className="px-4 md:px-8 py-6 md:py-10 max-w-[1100px]">
      <h1 className="font-display uppercase text-[clamp(1.5rem,4vw,2rem)] leading-[1.1] chisel text-[color:var(--basalt)]">Software</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[color:var(--basalt-2)] max-w-[72ch]">
        The software each science uses, open and closed, and how Research OS reaches it: in the page, on a registered machine, by reading its files, or by a link.{" "}
        <a href={MEMO_URL} target="_blank" rel="noreferrer" className="underline underline-offset-4">
          The atlas
        </a>{" "}
        holds the full rows and every source.
      </p>
      <div role="tablist" aria-label="Software atlas" className="mt-6 flex flex-wrap gap-1 border-b border-[color:var(--hairline)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`small-caps text-[11px] tracking-[0.16em] px-3 py-3 min-h-[44px] border-b-2 -mb-px ${tab === t.id ? "border-[color:var(--gold-deep)] text-[color:var(--basalt)]" : "border-transparent text-[color:var(--basalt-3)]"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-5" role="tabpanel">
        {tab === "tools" && <ToolsTab data={data} />}
        {tab === "suite" && <SuiteTab data={data} />}
        {tab === "viewers" && <ViewersTab data={data} />}
        {tab === "directions" && <DirectionsTab data={data} />}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import { ACCEPT, fileToText } from "@/lib/research-os/advisors/extract";
import { shortlistCsv, type ShortlistRow } from "@/lib/research-os/advisors/csv";

type Decision = "yes" | "no" | "maybe";

type Match = {
  openalexId: string;
  name: string;
  institution: string;
  country: string;
  field: string;
  topics: string[];
  links: Record<string, string>;
  rank: number;
  score: number;
  percentile: number;
  shared: string[];
};

type SwipeRow = {
  openalexId: string;
  decision: Decision;
  updatedAt: string;
  profile: { name: string; institution: string; country: string; field: string; topics: string[]; links: Record<string, string> } | null;
};

const LABEL = "small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]";
const BUTTON = "border border-[color:var(--hairline)] px-3 py-2 text-[13px] text-[color:var(--basalt)] hover:border-[color:var(--gold-deep)] disabled:opacity-40";
const DECISION_LABEL: Record<Decision, string> = { yes: "Yes", maybe: "Maybe", no: "No" };

function topShare(percentile: number): string {
  return `top ${Math.max(100 - percentile, 0.1).toFixed(1)}%`;
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function Card({ m, decision, onDecide }: { m: Match; decision?: Decision; onDecide: (d: Decision | null) => void }) {
  return (
    <article className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-4 grid gap-3" data-decision={decision ?? "none"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-[20px] leading-[1.2] text-[color:var(--basalt)] break-words">{m.name}</h3>
          <p className="text-[13px] text-[color:var(--basalt-3)]">{[m.institution, m.country].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display text-[20px] leading-none text-[color:var(--basalt)]">#{m.rank}</div>
          <div className="text-[11px] text-[color:var(--basalt-3)]">{topShare(m.percentile)}</div>
        </div>
      </div>
      {m.shared.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Topics you share">
          {m.shared.map((t) => (
            <li key={t} className="border border-[color:var(--hairline)] bg-[color:var(--bone-2)] px-2 py-0.5 text-[12px] text-[color:var(--basalt-2)]">{t}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[color:var(--basalt-3)]">
        {m.field && <span>{m.field}</span>}
        <span>score {m.score.toFixed(3)}</span>
        {m.links.openalex && <a className="underline underline-offset-4" href={m.links.openalex} target="_blank" rel="noopener noreferrer">OpenAlex</a>}
        {m.links.orcid && <a className="underline underline-offset-4" href={m.links.orcid} target="_blank" rel="noopener noreferrer">ORCID</a>}
        {m.links.institution && <a className="underline underline-offset-4" href={m.links.institution} target="_blank" rel="noopener noreferrer">Institution</a>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(["yes", "maybe", "no"] as Decision[]).map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={decision === d}
            onClick={() => onDecide(decision === d ? null : d)}
            className={`${BUTTON} ${decision === d ? "bg-[color:var(--basalt)] text-[color:var(--bone)]" : ""}`}
          >
            {DECISION_LABEL[d]}
          </button>
        ))}
      </div>
    </article>
  );
}

export default function AdvisorMatch() {
  const supabase = useMemo(() => {
    try {
      return getSupabase();
    } catch {
      return null;
    }
  }, []);
  const [token, setToken] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [total, setTotal] = useState(0);
  const [capped, setCapped] = useState(true);
  const [view, setView] = useState<"deck" | "list">("deck");
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [swipes, setSwipes] = useState<SwipeRow[]>([]);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [offsetX, setOffsetX] = useState(0);

  useEffect(() => {
    supabase?.auth.getSession().then(({ data }: { data: { session: { access_token: string } | null } }) => setToken(data.session?.access_token ?? null));
  }, [supabase]);

  const call = useCallback(
    async (path: string, init: RequestInit = {}) => {
      if (!token) throw new Error("Sign in first.");
      const res = await fetch(path, { ...init, headers: { ...(init.headers ?? {}), authorization: `Bearer ${token}`, "content-type": "application/json" } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof body.message === "string" ? body.message : `Request failed (${res.status}).`);
      return body;
    },
    [token],
  );

  const loadSwipes = useCallback(async () => {
    const body = await call("/api/research-os/advisors/swipes");
    const rows = body.swipes as SwipeRow[];
    setSwipes(rows);
    setDecisions(Object.fromEntries(rows.map((r) => [r.openalexId, r.decision])));
  }, [call]);

  useEffect(() => {
    if (token) loadSwipes().catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [token, loadSwipes]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      setText(await fileToText(file));
      setFileName(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function runMatch(offset = 0, cap = capped) {
    setError(null);
    setBusy(true);
    try {
      const body = await call("/api/research-os/advisors/match", { method: "POST", body: JSON.stringify({ text, offset, cap: cap ? 5 : null }) });
      setTotal(body.total);
      setMatches((prev) => (offset === 0 ? body.results : prev.concat(body.results)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function decide(m: Match, d: Decision | null) {
    const before = decisions[m.openalexId];
    setDecisions((prev) => {
      const next = { ...prev };
      if (d) next[m.openalexId] = d;
      else delete next[m.openalexId];
      return next;
    });
    try {
      await call("/api/research-os/advisors/swipes", { method: "PUT", body: JSON.stringify({ openalexId: m.openalexId, decision: d }) });
      setSwipes((prev) => {
        const rest = prev.filter((s) => s.openalexId !== m.openalexId);
        return d ? [{ openalexId: m.openalexId, decision: d, updatedAt: new Date().toISOString(), profile: m }, ...rest] : rest;
      });
    } catch (e) {
      setDecisions((prev) => ({ ...prev, ...(before ? { [m.openalexId]: before } : {}) }));
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function clearAll() {
    if (!window.confirm("Delete all your advisor decisions?")) return;
    try {
      await call("/api/research-os/advisors/swipes", { method: "DELETE" });
      setSwipes([]);
      setDecisions({});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const next = matches.find((m) => !decisions[m.openalexId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (view !== "deck" || !next || (e.target as HTMLElement)?.closest?.("input,textarea,select")) return;
      const map: Record<string, Decision> = { y: "yes", n: "no", m: "maybe", ArrowRight: "yes", ArrowLeft: "no", ArrowUp: "maybe" };
      const d = map[e.key];
      if (d) {
        e.preventDefault();
        void decide(next, d);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function exportShortlist() {
    const byId = new Map(matches.map((m) => [m.openalexId, m]));
    const rows: ShortlistRow[] = swipes
      .filter((s) => s.decision !== "no")
      .sort((a, b) => (a.decision === b.decision ? (byId.get(a.openalexId)?.rank ?? 9999) - (byId.get(b.openalexId)?.rank ?? 9999) : a.decision === "yes" ? -1 : 1))
      .map((s) => {
        const m = byId.get(s.openalexId);
        const p = m ?? s.profile;
        return {
          decision: s.decision,
          rank: m?.rank ?? 0,
          name: p?.name ?? s.openalexId,
          institution: p?.institution ?? "",
          country: p?.country ?? "",
          field: p?.field ?? "",
          score: m?.score ?? 0,
          percentile: m?.percentile ?? 0,
          links: p?.links ?? { openalex: `https://openalex.org/${s.openalexId}` },
          shared: m?.shared ?? [],
        };
      });
    download("advisor-shortlist.csv", shortlistCsv(rows));
  }

  const counts = { yes: 0, maybe: 0, no: 0 };
  for (const s of swipes) counts[s.decision]++;

  if (!supabase) return <p className="p-6 text-[14px]">Sign-in is not configured here.</p>;

  return (
    <main className="mx-auto max-w-[980px] px-4 py-6 md:px-8">
      <p className={LABEL}>Research OS</p>
      <h1 className="font-display text-[clamp(1.6rem,4vw,2.2rem)] leading-[1.1] text-[color:var(--basalt)]">Advisor match</h1>
      <p className="mt-2 max-w-[62ch] text-[14px] text-[color:var(--basalt-2)]">
        Add your resume or research statement. It is read in this browser and sent once for ranking; Bucket keeps your decisions and discards the text.
      </p>

      <section className="mt-6 grid gap-3 border-t border-[color:var(--basalt)] pt-4">
        <label className="grid gap-1 text-[13px] text-[color:var(--basalt-2)]">
          <span className={LABEL}>File</span>
          <input type="file" accept={ACCEPT} onChange={(e) => onFile(e.target.files?.[0])} disabled={busy} className="text-[13px]" />
        </label>
        <label className="grid gap-1 text-[13px] text-[color:var(--basalt-2)]">
          <span className={LABEL}>Or paste text{fileName ? `, read from ${fileName}` : ""}</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            className="w-full border border-[color:var(--hairline)] bg-[color:var(--bone)] p-3 text-[14px]"
            placeholder="Paste your research statement"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={BUTTON} disabled={busy || text.trim().length < 40 || !token} onClick={() => runMatch(0)}>
            {busy ? "Working" : "Find advisors"}
          </button>
          <label className="flex items-center gap-2 text-[13px] text-[color:var(--basalt-2)]">
            <input
              type="checkbox"
              checked={capped}
              onChange={(e) => {
                setCapped(e.target.checked);
                if (matches.length) void runMatch(0, e.target.checked);
              }}
            />
            At most 5 per institution in the top 50
          </label>
        </div>
        {error && <p role="alert" className="text-[13px] text-[color:var(--gold-deep)]">{error}</p>}
      </section>

      {matches.length > 0 && (
        <section className="mt-8">
          <div className="flex flex-wrap items-center gap-2 border-b border-[color:var(--hairline)] pb-3">
            <div role="group" aria-label="View" className="flex gap-2">
              {(["deck", "list"] as const).map((v) => (
                <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`${BUTTON} ${view === v ? "bg-[color:var(--basalt)] text-[color:var(--bone)]" : ""}`}>
                  {v === "deck" ? "One at a time" : "List"}
                </button>
              ))}
            </div>
            <span className="text-[12px] text-[color:var(--basalt-3)]">
              {counts.yes} yes · {counts.maybe} maybe · {counts.no} no
            </span>
          </div>

          {view === "deck" ? (
            <div className="mx-auto mt-4 max-w-[560px]" aria-live="polite">
              {next ? (
                <div
                  style={{ transform: `translateX(${offsetX}px)`, touchAction: "pan-y" }}
                  onPointerDown={(e) => {
                    if ((e.target as HTMLElement).closest("button,a")) return;
                    drag.current = { x: e.clientX, y: e.clientY };
                  }}
                  onPointerMove={(e) => drag.current && setOffsetX(e.clientX - drag.current.x)}
                  onPointerUp={(e) => {
                    const start = drag.current;
                    drag.current = null;
                    setOffsetX(0);
                    if (!start) return;
                    const dx = e.clientX - start.x;
                    const dy = e.clientY - start.y;
                    if (dx > 90) void decide(next, "yes");
                    else if (dx < -90) void decide(next, "no");
                    else if (dy < -90) void decide(next, "maybe");
                  }}
                >
                  <Card m={next} decision={decisions[next.openalexId]} onDecide={(d) => decide(next, d)} />
                </div>
              ) : (
                <p className="py-8 text-center text-[14px] text-[color:var(--basalt-3)]">Every loaded advisor has a decision.</p>
              )}
              <p className="mt-2 text-center text-[12px] text-[color:var(--basalt-3)]">Swipe right for yes, left for no, up for maybe. Keys y, n and m.</p>
            </div>
          ) : (
            <ol className="mt-4 grid gap-3 md:grid-cols-2">
              {matches.map((m) => (
                <li key={m.openalexId}>
                  <Card m={m} decision={decisions[m.openalexId]} onDecide={(d) => decide(m, d)} />
                </li>
              ))}
            </ol>
          )}

          {matches.length < total && (
            <p className="mt-4 text-center">
              <button type="button" className={BUTTON} disabled={busy} onClick={() => runMatch(matches.length)}>
                Load 25 more of {total}
              </button>
            </p>
          )}
        </section>
      )}

      <section className="mt-10 border-t border-[color:var(--basalt)] pt-4">
        <h2 className={LABEL}>Shortlist</h2>
        <p className="mt-1 text-[13px] text-[color:var(--basalt-2)]">
          {counts.yes} yes and {counts.maybe} maybe, saved to your account.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={BUTTON} disabled={counts.yes + counts.maybe === 0} onClick={exportShortlist}>
            Export CSV
          </button>
          <button type="button" className={BUTTON} disabled={swipes.length === 0} onClick={clearAll}>
            Delete my decisions
          </button>
        </div>
        <p className="mt-4 text-[12px] text-[color:var(--basalt-3)]">
          Profiles come from OpenAlex and ROR. Researchers can ask to be removed at <Link className="underline underline-offset-4" href="/research-os/remove-advisor">remove an advisor profile</Link>.
        </p>
      </section>
    </main>
  );
}

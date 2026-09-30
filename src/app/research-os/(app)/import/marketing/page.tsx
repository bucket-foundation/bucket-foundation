"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabase, supabaseConfigured } from "@/lib/supabase/browser";
import { uploadAndAttach } from "@/lib/research-os/import-client";
import { isTransientOutage, OUTAGE_COPY } from "@/lib/research-os/outage";
import { MAX_TITLE } from "@/lib/research-os/import-types";
import { MARKETING_EXTENSIONS, MAX_MARKETING_FILE_BYTES, MAX_MARKETING_FILES, marketingExtension } from "@/lib/research-os/marketing/sniff";
import { MarketingReportView, type MarketingSection } from "./report-view";

interface Picked {
  file: File;
  state: string;
  failed: boolean;
}

interface Result {
  importId: string;
  report: { marketing?: MarketingSection; form?: { file?: string } };
}

const MB = 1024 * 1024;
async function api<T>(url: string, init: RequestInit): Promise<{ ok: true; body: T } | { ok: false; message: string }> {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => null)) as (T & { message?: string; error?: string }) | null;
  if (res.ok && body) return { ok: true, body };
  if (isTransientOutage(res.status, body?.error ?? null)) return { ok: false, message: OUTAGE_COPY.body };
  return { ok: false, message: body?.message ?? `The request failed (${res.status}).` };
}

const ACCEPT = MARKETING_EXTENSIONS.map((e) => `.${e}`).join(",");

function fileProblem(f: File): string | null {
  if (!marketingExtension(f.name)) return `Only ${MARKETING_EXTENSIONS.join(", ")} files.`;
  if (f.size === 0) return "The file is empty.";
  if (f.size > MAX_MARKETING_FILE_BYTES) return `Larger than ${MAX_MARKETING_FILE_BYTES / MB} MB.`;
  return null;
}

export default function MarketingImportPage() {
  const [title, setTitle] = useState("");
  const [picked, setPicked] = useState<Picked[]>([]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured()) return;
    const supabase = getBrowserSupabase();
    void supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setToken(session?.access_token ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const headers = useCallback(() => ({ "content-type": "application/json", authorization: `Bearer ${token}` }), [token]);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("import");
    if (!id || !token) return;
    void api<Result>(`/api/research-os/marketing?import=${encodeURIComponent(id)}`, { headers: headers() }).then((r) => {
      if (r.ok) setResult({ importId: id, report: r.body.report });
      else setProblem(r.message);
    });
  }, [token, headers]);

  const add = (files: FileList | null) => {
    if (!files) return;
    setResult(null);
    setPicked((cur) => [...cur, ...Array.from(files).map((file) => ({ file, state: fileProblem(file) ?? "waiting", failed: Boolean(fileProblem(file)) }))].slice(0, MAX_MARKETING_FILES));
  };

  const mark = (i: number, state: string, failed = false) => setPicked((cur) => cur.map((p, j) => (j === i ? { ...p, state, failed } : p)));

  async function run() {
    const usable = picked.filter((p) => !fileProblem(p.file));
    if (!title.trim()) return setProblem("Give the analysis a title.");
    if (!usable.length) return setProblem("Add at least one file inside the limits.");
    if (!token) return setProblem("Sign in to analyze files.");
    setBusy(true);
    setProblem(null);
    try {
      const created = await api<{ importId: string }>("/api/research-os/marketing", { method: "POST", headers: headers(), body: JSON.stringify({ action: "create", title: title.trim() }) });
      if (!created.ok) return setProblem(created.message);
      const importId = created.body.importId;
      const supabase = getBrowserSupabase();
      const ownerId = (await supabase.auth.getUser()).data.user?.id ?? "";
      let recorded = 0;
      for (let i = 0; i < picked.length; i += 1) {
        if (fileProblem(picked[i].file)) continue;
        const out = await uploadAndAttach({ supabase, ownerId, importId, file: picked[i].file, headers: headers(), onStage: (stage) => mark(i, stage) });
        if (out.ok) {
          recorded += 1;
          mark(i, "recorded");
        } else mark(i, out.message, true);
      }
      if (!recorded) return setProblem("No file was recorded, so nothing was analyzed.");
      const analyzed = await api<Result>("/api/research-os/marketing", { method: "POST", headers: headers(), body: JSON.stringify({ action: "analyze", importId }) });
      if (!analyzed.ok) return setProblem(analyzed.message);
      setResult({ importId, report: analyzed.body.report });
      window.history.replaceState(null, "", `?import=${encodeURIComponent(importId)}`);
    } catch {
      setProblem("The analysis did not finish.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!result || !window.confirm("Delete these files and the saved analysis? This cannot be undone.")) return;
    setBusy(true);
    const res = await api<{ deleted: boolean }>(`/api/research-os/marketing?import=${encodeURIComponent(result.importId)}`, { method: "DELETE", headers: headers() });
    setBusy(false);
    if (!res.ok) return setProblem(res.message);
    setResult(null);
    setPicked([]);
    setProblem("Deleted. The files and the saved analysis are gone from this install.");
    window.history.replaceState(null, "", window.location.pathname);
  }

  return (
    <main className="flex flex-col gap-6">
      <div>
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">Research OS · marketing data</div>
        <h1 className="font-display uppercase text-[clamp(1.4rem,3.5vw,2.2rem)] leading-[1.1] text-[color:var(--basalt)]">analyze your marketing exports</h1>
        <p className="mt-2 text-[14px] leading-[1.7] text-[color:var(--basalt-2)] max-w-2xl">
          Drop exports from Meta Ads, Google Ads, GA4, Shopify, Stripe or HubSpot, or any table with dates and spend. Up to {MAX_MARKETING_FILES} files of {MAX_MARKETING_FILE_BYTES / MB} MB each.
          The files stay private to you, the analysis runs on this install with no outside service, and the saved report is encrypted. Delete removes both at once; a hosted database keeps backups until its backup window ends.
        </p>
      </div>

      <section className="border border-[color:var(--hairline)] p-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)]">title</span>
          <input value={title} maxLength={MAX_TITLE} onChange={(e) => setTitle(e.target.value)} placeholder="Q1 paid media" className="border border-[color:var(--hairline)] px-2 py-2 text-[13px] bg-white/60" />
        </label>
        <label className="border border-dashed border-[color:var(--hairline)] p-6 text-center text-[13px] cursor-pointer">
          <input type="file" multiple accept={ACCEPT} className="sr-only" disabled={busy} onChange={(e) => add(e.target.files)} />
          Choose files: {MARKETING_EXTENSIONS.join(", ")}
        </label>
        {picked.length > 0 && (
          <ul className="text-[13px] flex flex-col gap-1">
            {picked.map((p, i) => (
              <li key={`${p.file.name}-${i}`} className={p.failed ? "text-[color:var(--terracotta,#a33)]" : ""}>
                {p.file.name} · {p.state}
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-3">
          <button type="button" disabled={busy} onClick={() => void run()} className="border border-[color:var(--basalt)] px-4 py-2 text-[13px]">
            {busy ? "Working…" : "Upload and analyze"}
          </button>
          {result && (
            <button type="button" disabled={busy} onClick={() => void remove()} className="border border-[color:var(--hairline)] px-4 py-2 text-[13px]">
              Delete files and report
            </button>
          )}
        </div>
        {problem && <p className="text-[13px] text-[color:var(--basalt-2)]">{problem}</p>}
      </section>

      {result?.report.marketing && <MarketingReportView section={result.report.marketing} />}
    </main>
  );
}

"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { GrowthReport } from "@/lib/growth/report";
import GrowthReportView from "./GrowthReportView";

const STORAGE_KEY = "bucket.waitlist.key";
const INPUT =
  "w-full border border-[color:var(--hairline)] px-3 py-3 text-[15px] bg-white/70 text-[color:var(--basalt)] focus:outline-none focus:border-[color:var(--gold-deep)]";
const BUTTON =
  "px-4 py-2 text-[12px] small-caps tracking-[0.14em] bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50 min-h-[44px]";

type Report = GrowthReport & { truncated?: boolean };

function readKey(): string {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeKey(value: string | null) {
  try {
    if (value) window.sessionStorage.setItem(STORAGE_KEY, value);
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
  }
}

export default function GrowthAdmin() {
  const [key, setKey] = useState("");
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (k: string) => {
    if (!k) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/growth", { headers: { authorization: `Bearer ${k}` }, cache: "no-store" });
      if (res.status === 404) {
        setData(null);
        writeKey(null);
        setError("That key does not open the report.");
        return;
      }
      const body = (await res.json().catch(() => ({}))) as Partial<Report> & { error?: string };
      if (!res.ok || !Array.isArray(body.funnel)) {
        setError(body.error ?? `The report did not load (HTTP ${res.status}).`);
        return;
      }
      writeKey(k);
      setData(body as Report);
    } catch {
      setError("No connection. Check your network and try again.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const saved = readKey();
    if (saved) {
      setKey(saved);
      void load(saved);
    }
  }, [load]);

  if (!data) {
    return (
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void load(key.trim());
        }}
        className="mt-8 flex flex-col gap-3 max-w-[400px]"
      >
        <label htmlFor="growth-key" className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">admin key</label>
        <input id="growth-key" type="password" autoComplete="current-password" value={key} onChange={(e) => setKey(e.target.value)} className={INPUT} />
        <button type="submit" disabled={busy || !key.trim()} className={BUTTON + " w-full"}>{busy ? "opening" : "open the report"}</button>
        {error && <p role="alert" className="text-[12px] text-[color:var(--crimson)]">{error}</p>}
      </form>
    );
  }

  return (
    <section className="mt-8 flex flex-col gap-10">
      <GrowthReportView data={data} />
      <button type="button" onClick={() => void load(key)} disabled={busy} className={BUTTON + " self-start"}>{busy ? "loading" : "refresh"}</button>
    </section>
  );
}

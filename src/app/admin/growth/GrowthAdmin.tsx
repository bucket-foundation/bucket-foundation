"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { GrowthReport } from "@/lib/growth/report";

const STORAGE_KEY = "bucket.waitlist.key";
const INPUT =
  "w-full border border-[color:var(--hairline)] px-3 py-3 text-[15px] bg-white/70 text-[color:var(--basalt)] focus:outline-none focus:border-[color:var(--gold-deep)]";
const BUTTON =
  "px-4 py-2 text-[12px] small-caps tracking-[0.14em] bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50 min-h-[44px]";
const H2 = "small-caps text-[12px] tracking-[0.18em] text-[color:var(--basalt-2)] mb-3";
const TH = "text-left px-2 py-2 small-caps text-[10px] tracking-[0.14em] text-[color:var(--basalt-3)] whitespace-nowrap";
const TD = "px-2 py-2 text-[13px] text-[color:var(--basalt)] align-top";

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

function pct(v: number | null): string {
  return v === null ? "-" : `${Math.round(v * 100)}%`;
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

  const top = data.funnel.find((s) => s.count !== null && s.count > 0)?.count ?? null;

  return (
    <section className="mt-8 flex flex-col gap-10">
      <p className="text-[12px] text-[color:var(--basalt-3)]">
        Generated {data.generatedAt.slice(0, 16).replace("T", " ")} UTC. App Store Connect snapshot {data.snapshotAt ? data.snapshotAt.slice(0, 16).replace("T", " ") + " UTC" : "not taken yet"}.
        {data.truncated ? " Event cap reached: counts are partial." : ""}
      </p>
      <div>
        <h2 className={H2}>Funnel</h2>
        <ol className="flex flex-col gap-2">
          {data.funnel.map((s) => (
            <li key={s.key} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="font-display text-[24px] leading-none text-[color:var(--basalt)] min-w-[64px]">{s.count ?? "-"}</span>
                <span className="text-[14px] text-[color:var(--basalt)]">{s.label}</span>
                <span className="text-[11px] text-[color:var(--basalt-3)]">{s.source}</span>
              </div>
              {s.count !== null && top ? (
                <div className="h-[6px] bg-[color:var(--gold)]" style={{ width: `${Math.max(2, Math.min(100, (s.count / top) * 100))}%` }} />
              ) : null}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[13px] text-[color:var(--basalt-2)]">
          Retention of testers: D1 {pct(data.retention[1])}, D7 {pct(data.retention[7])}, D30 {pct(data.retention[30])}.
        </p>
      </div>
      <div>
        <h2 className={H2}>Signups by week</h2>
        <p className="text-[13px] text-[color:var(--basalt-2)]">{data.signupsByWeek.map((w) => `${w.week}: ${w.count}`).join(" · ") || "-"}</p>
      </div>
      {(["bucket", "polingual"] as const).map((app) => (
        <div key={app}>
          <h2 className={H2}>
            {app} builds, median {data.medianDaysBetweenBuilds[app] ?? "-"} days apart
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[color:var(--hairline)]">
                  {["uploaded", "version", "build", "gap", "state", "what changed"].map((h) => (
                    <th key={h} className={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.cadence[app].map((b) => (
                  <tr key={`${b.version}-${b.build}`} className="border-b border-[color:var(--hairline)]">
                    <td className={TD + " whitespace-nowrap"}>{b.uploadedAt.slice(0, 10)}</td>
                    <td className={TD}>{b.version}</td>
                    <td className={TD}>{b.build}</td>
                    <td className={TD}>{b.daysSincePrevious === null ? "-" : `${b.daysSincePrevious}d`}</td>
                    <td className={TD}>{b.state.toLowerCase()}</td>
                    <td className={TD}>
                      {b.notes.length ? (
                        <ul className="list-disc pl-4">{b.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
                      ) : (
                        <span className="text-[color:var(--basalt-3)]">{b.tag ? "no commits" : "no build tag"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => void load(key)} disabled={busy} className={BUTTON + " self-start"}>{busy ? "loading" : "refresh"}</button>
    </section>
  );
}

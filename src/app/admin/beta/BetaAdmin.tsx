"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { EXPERIMENTS, type CohortSettingRow } from "@/lib/beta/experiment-registry";
import type { ArmSummary, BetaReport, CohortSummary, UserSummary } from "@/lib/beta/metrics";

type Report = BetaReport & { settings: CohortSettingRow[]; truncated?: boolean };

const STORAGE_KEY = "bucket.waitlist.key";
const INPUT =
  "w-full border border-[color:var(--hairline)] px-3 py-3 text-[15px] bg-white/70 text-[color:var(--basalt)] focus:outline-none focus:border-[color:var(--gold-deep)]";
const BUTTON =
  "px-4 py-2 text-[12px] small-caps tracking-[0.14em] bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50 min-h-[44px]";
const TH = "text-left px-2 py-2 small-caps text-[10px] tracking-[0.14em] text-[color:var(--basalt-3)] whitespace-nowrap";
const TD = "px-2 py-2 text-[13px] text-[color:var(--basalt)] whitespace-nowrap";

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

function flag(v: boolean | null): string {
  return v === null ? "-" : v ? "yes" : "no";
}

function day(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "-";
}

function minutes(s: number): string {
  return `${Math.round(s / 60)}m`;
}

export function CohortTable({ rows, label }: { rows: (CohortSummary | ArmSummary)[]; label: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[color:var(--hairline)]">
            {[label, "users", "active", "sessions", "answers", "accuracy", "time/card", "lessons", "D1", "D7", "D30", "pinned", "recall D1", "recall D7", "recall D30"].map((h) => (
              <th key={h} className={TH}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.cohort} className="border-b border-[color:var(--hairline)]">
              <td className={TD}>{c.cohort}</td>
              <td className={TD}>{c.users}</td>
              <td className={TD}>{c.activeUsers}</td>
              <td className={TD}>{c.sessions}</td>
              <td className={TD}>{c.cardsAnswered}</td>
              <td className={TD}>{pct(c.accuracy)}</td>
              <td className={TD}>{c.avgCardMs === null ? "-" : `${(c.avgCardMs / 1000).toFixed(1)}s`}</td>
              <td className={TD}>{c.lessonsCompleted}</td>
              <td className={TD}>{pct(c.retention[1])}</td>
              <td className={TD}>{pct(c.retention[7])}</td>
              <td className={TD}>{pct(c.retention[30])}</td>
              <td className={TD}>{"pinned" in c ? c.pinned : "-"}</td>
              <td className={TD}>{pct(c.recall[1])}</td>
              <td className={TD}>{pct(c.recall[7])}</td>
              <td className={TD}>{pct(c.recall[30])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserTable({ rows }: { rows: UserSummary[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[color:var(--hairline)]">
            {["tester", "cohort", "apps", "first", "last", "days", "sessions", "time", "shown", "answers", "correct", "lessons", "D1", "D7", "D30"].map((h) => (
              <th key={h} className={TH}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.userId} className="border-b border-[color:var(--hairline)]">
              <td className={TD + " font-mono text-[11px]"} title={u.userId}>{u.userId.slice(0, 8)}</td>
              <td className={TD}>{u.cohort}</td>
              <td className={TD}>{u.apps.join(", ") || "-"}</td>
              <td className={TD}>{day(u.firstSeen)}</td>
              <td className={TD}>{day(u.lastSeen)}</td>
              <td className={TD}>{u.activeDays}</td>
              <td className={TD}>{u.sessions}</td>
              <td className={TD}>{minutes(u.secondsInSession)}</td>
              <td className={TD}>{u.cardsShown}</td>
              <td className={TD}>{u.cardsAnswered}</td>
              <td className={TD}>{u.cardsCorrect}</td>
              <td className={TD}>{u.lessonsCompleted}</td>
              <td className={TD}>{flag(u.retained[1])}</td>
              <td className={TD}>{flag(u.retained[7])}</td>
              <td className={TD}>{flag(u.retained[30])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BetaAdmin() {
  const [key, setKey] = useState("");
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (k: string) => {
    if (!k) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/beta", { headers: { authorization: `Bearer ${k}` }, cache: "no-store" });
      if (res.status === 404) {
        setData(null);
        writeKey(null);
        setError("That key does not open the report.");
        return;
      }
      const body = (await res.json().catch(() => ({}))) as Partial<Report> & { error?: string };
      if (!res.ok || !Array.isArray(body.users)) {
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

  async function saveSetting(experiment: string, cohort: string, setting: string) {
    setError(null);
    try {
      const res = await fetch("/api/admin/beta", {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({ experiment, cohort, setting }),
      });
      if (!res.ok) {
        setError(`The setting did not save (HTTP ${res.status}).`);
        return;
      }
      await load(key);
    } catch {
      setError("No connection. Check your network and try again.");
    }
  }

  if (!data) {
    return (
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void load(key.trim());
        }}
        className="mt-8 flex flex-col gap-3 max-w-[400px]"
      >
        <label htmlFor="beta-key" className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">admin key</label>
        <input id="beta-key" type="password" autoComplete="current-password" value={key} onChange={(e) => setKey(e.target.value)} className={INPUT} />
        <button type="submit" disabled={busy || !key.trim()} className={BUTTON + " w-full"}>{busy ? "opening" : "open the report"}</button>
        {error && <p role="alert" className="text-[12px] text-[color:var(--crimson)]">{error}</p>}
      </form>
    );
  }

  return (
    <section className="mt-8 flex flex-col gap-10">
      <p className="text-[12px] text-[color:var(--basalt-3)]">Generated {data.generatedAt.slice(0, 16).replace("T", " ")} UTC. Last 90 days.{data.truncated ? " Event cap reached: counts are partial." : ""}</p>
      <div>
        <h2 className="small-caps text-[12px] tracking-[0.18em] text-[color:var(--basalt-2)] mb-3">Cohorts</h2>
        <CohortTable rows={data.cohorts} label="cohort" />
      </div>
      <div>
        <h2 className="small-caps text-[12px] tracking-[0.18em] text-[color:var(--basalt-2)] mb-3">Testers</h2>
        <UserTable rows={data.users} />
      </div>
      <div>
        <h2 className="small-caps text-[12px] tracking-[0.18em] text-[color:var(--basalt-2)] mb-3">Experiments</h2>
        {data.experiments.map((x) => {
          const exp = EXPERIMENTS.find((e) => e.key === x.key);
          return (
            <div key={x.key} className="mb-8">
              <h3 className="text-[14px] text-[color:var(--basalt)] mb-2">
                {x.key} <span className="text-[12px] text-[color:var(--basalt-3)]">{x.excluded} not assigned. Pinned testers are not randomized; compare hash-split testers.</span>
              </h3>
              <CohortTable rows={x.arms} label="arm" />
              <div className="mt-2 flex flex-wrap gap-3">
                {data.cohorts.map((c) => {
                  const current = data.settings.find((r) => r.experiment === x.key && r.cohort === c.cohort)?.setting ?? "on";
                  return (
                    <label key={c.cohort} className="text-[12px] text-[color:var(--basalt-2)] flex items-center gap-2">
                      {c.cohort}
                      <select
                        value={current}
                        onChange={(e) => void saveSetting(x.key, c.cohort, e.target.value)}
                        className="border border-[color:var(--hairline)] px-2 py-1 bg-white/70 min-h-[44px]"
                      >
                        {["on", "off", ...(exp?.arms ?? [])].map((o) => (
                          <option key={o} value={o}>{o === "on" ? "random" : o}</option>
                        ))}
                      </select>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {error && <p role="alert" className="text-[12px] text-[color:var(--crimson)]">{error}</p>}
      <button type="button" onClick={() => void load(key)} disabled={busy} className={BUTTON + " self-start"}>{busy ? "loading" : "refresh"}</button>
    </section>
  );
}

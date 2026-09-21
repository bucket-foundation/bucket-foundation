"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import type { WaitlistEntry } from "@/lib/waitlist/core";

const STORAGE_KEY = "bucket.waitlist.key";
const INPUT =
  "w-full border border-[color:var(--hairline)] px-3 py-3 text-[15px] bg-white/70 text-[color:var(--basalt)] focus:outline-none focus:border-[color:var(--gold-deep)]";
const BUTTON =
  "px-4 py-2 text-[12px] small-caps tracking-[0.14em] bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50 min-h-[44px]";
const QUIET =
  "px-3 py-2 text-[12px] small-caps tracking-[0.14em] border border-[color:var(--hairline)] text-[color:var(--basalt-2)] hover:text-[color:var(--basalt)] min-h-[44px]";

interface ListResponse {
  store: string;
  prefix: string;
  count: number;
  entries: WaitlistEntry[];
  /** Signups that filled the hidden honeypot field; held apart for review. */
  suspects?: WaitlistEntry[];
}

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
    // Storage blocked: the key lives for this page view only.
  }
}

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function WaitlistAdmin() {
  const [key, setKey] = useState("");
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async (k: string) => {
    if (!k) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/waitlist", {
        headers: { authorization: `Bearer ${k}` },
        cache: "no-store",
      });
      if (res.status === 404) {
        setData(null);
        writeKey(null);
        setError("That key does not open the list.");
        return;
      }
      const body = (await res
        .json()
        .catch(() => ({}))) as Partial<ListResponse> & { error?: string };
      if (!res.ok || !Array.isArray(body.entries)) {
        setError(body.error ?? `The list did not load (HTTP ${res.status}).`);
        return;
      }
      writeKey(k);
      setData(body as ListResponse);
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

  const roles = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of data?.entries ?? [])
      counts.set(
        e.role ?? "no role",
        (counts.get(e.role ?? "no role") ?? 0) + 1,
      );
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [data]);

  async function downloadCsv() {
    setError(null);
    try {
      const res = await fetch("/api/waitlist?format=csv", {
        headers: { authorization: `Bearer ${key}` },
        cache: "no-store",
      });
      if (!res.ok) {
        setError(`The CSV did not download (HTTP ${res.status}).`);
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `bucket-launch-list-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("No connection. Check your network and try again.");
    }
  }

  async function copyEmails() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(
        data.entries.map((e) => e.email).join(", "),
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("The browser blocked the clipboard. Use the CSV.");
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
        <label
          htmlFor="waitlist-key"
          className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]"
        >
          list key
        </label>
        <input
          id="waitlist-key"
          type="password"
          autoComplete="current-password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className={INPUT}
        />
        <button
          type="submit"
          disabled={busy || !key.trim()}
          className={BUTTON + " w-full"}
        >
          {busy ? "opening" : "open the list"}
        </button>
        {error && (
          <p role="alert" className="text-[12px] text-[color:var(--crimson)]">
            {error}
          </p>
        )}
      </form>
    );
  }

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <p className="text-[15px] text-[color:var(--basalt)]">
          <span className="font-display text-[28px] leading-none mr-2">
            {data.count}
          </span>
          {data.count === 1 ? "signup" : "signups"}
        </p>
        {roles.length > 0 && (
          <p className="text-[12px] text-[color:var(--basalt-3)]">
            {roles.map(([r, n]) => `${r} ${n}`).join(" · ")}
          </p>
        )}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void downloadCsv()}
          className={BUTTON}
        >
          download csv
        </button>
        <button
          type="button"
          onClick={() => void copyEmails()}
          className={QUIET}
          disabled={data.count === 0}
        >
          {copied ? "copied" : "copy emails"}
        </button>
        <button
          type="button"
          onClick={() => void load(key)}
          className={QUIET}
          disabled={busy}
        >
          {busy ? "loading" : "refresh"}
        </button>
        <button
          type="button"
          onClick={() => {
            writeKey(null);
            setKey("");
            setData(null);
          }}
          className={QUIET}
        >
          forget key
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="mt-3 text-[12px] text-[color:var(--crimson)]"
        >
          {error}
        </p>
      )}

      {data.count === 0 ? (
        <p className="mt-8 text-[13px] text-[color:var(--basalt-2)]">
          No signups yet.
        </p>
      ) : (
        <>
          <ul className="mt-6 md:hidden border-t border-[color:var(--hairline)]">
            {data.entries.map((e) => (
              <li
                key={e.email}
                className="border-b border-[color:var(--hairline)] py-3 text-[13px] text-[color:var(--basalt-2)]"
              >
                <a
                  href={`mailto:${e.email}`}
                  className="break-all underline underline-offset-4 text-[color:var(--basalt)]"
                >
                  {e.email}
                </a>
                <p className="mt-1">
                  {[
                    e.name,
                    e.role,
                    e.signups > 1 ? `joined ${e.signups} times` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="mt-1 text-[12px] text-[color:var(--basalt-3)]">
                  {when(e.created_at)}
                  {e.wanted ? (
                    <span className="font-mono"> · {e.wanted}</span>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-6 hidden md:block overflow-x-auto border border-[color:var(--hairline)]">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="small-caps text-[10px] tracking-[0.14em] text-[color:var(--basalt-3)] bg-white/40">
                <tr>
                  <th className="px-3 py-2 font-normal">signed up</th>
                  <th className="px-3 py-2 font-normal">email</th>
                  <th className="px-3 py-2 font-normal">name</th>
                  <th className="px-3 py-2 font-normal">role</th>
                  <th className="px-3 py-2 font-normal">wanted</th>
                  <th className="px-3 py-2 font-normal text-right">joins</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((e) => (
                  <tr
                    key={e.email}
                    className="border-t border-[color:var(--hairline)] text-[color:var(--basalt-2)]"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      {when(e.created_at)}
                    </td>
                    <td className="px-3 py-2 break-all">
                      <a
                        href={`mailto:${e.email}`}
                        className="underline underline-offset-4 text-[color:var(--basalt)]"
                      >
                        {e.email}
                      </a>
                    </td>
                    <td className="px-3 py-2">{e.name ?? ""}</td>
                    <td className="px-3 py-2">{e.role ?? ""}</td>
                    <td className="px-3 py-2 font-mono text-[12px]">
                      {e.wanted ?? ""}
                    </td>
                    <td className="px-3 py-2 text-right">{e.signups}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {(data.suspects?.length ?? 0) > 0 && (
        <details className="mt-8 text-[13px] text-[color:var(--basalt-2)]">
          <summary className="cursor-pointer small-caps text-[11px] tracking-[0.14em] text-[color:var(--basalt-3)] min-h-[44px] flex items-center">
            held by the bot filter: {data.suspects?.length}
          </summary>
          <p className="mt-2 text-[12px] text-[color:var(--basalt-3)]">
            These filled the hidden field that bots fill. A password manager can fill it for a real person, so they are kept here apart from the count and the CSV.
          </p>
          <ul className="mt-3 border-t border-[color:var(--hairline)]">
            {data.suspects?.map((e) => (
              <li key={e.email} className="border-b border-[color:var(--hairline)] py-2 break-all">
                {e.email}
                <span className="text-[12px] text-[color:var(--basalt-3)]"> · {when(e.created_at)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="mt-4 text-[11px] text-[color:var(--basalt-3)]">
        Stored in{" "}
        {data.store === "blob"
          ? "the private Vercel Blob store"
          : "local files"}{" "}
        under {data.prefix}
      </p>
    </section>
  );
}

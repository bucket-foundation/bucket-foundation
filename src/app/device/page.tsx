"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BTN_PRIMARY, BTN_SECONDARY, PageHeader } from "@/components/ui";
import { deviceCodeFromSearch, isSignedOut } from "@/lib/academy/device-code";

interface DeviceRow {
  device_id: string;
  kind: string | null;
  label: string | null;
  registered_at: string | null;
  revoked_at: string | null;
}

export default function DevicePage() {
  const [code, setCode] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [devices, setDevices] = useState<DeviceRow[] | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [pending, setPending] = useState<{ kind: string; label: string | null } | null>(null);

  const refresh = useCallback(async () => {
    const r = await fetch("/api/academy/devices", { cache: "no-store" });
    if (r.ok) return setDevices(((await r.json()) as { devices: DeviceRow[] }).devices);
    if (await isSignedOut(r)) setSignedOut(true);
  }, []);

  const lookup = useCallback(async (value: string) => {
    const r = await fetch(`/api/academy/device/approve?user_code=${encodeURIComponent(value)}`, { cache: "no-store" });
    if (await isSignedOut(r)) return setSignedOut(true);
    if (!r.ok) {
      setPending(null);
      return setNote("That code is unknown or has expired. Start again on the device.");
    }
    setNote(null);
    setPending((await r.json()) as { kind: string; label: string | null });
  }, []);

  useEffect(() => {
    const q = deviceCodeFromSearch(window.location.search);
    if (q) setCode(q);
    void refresh();
    if (q) void lookup(q);
  }, [refresh, lookup]);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    await lookup(code.trim().toUpperCase());
  }

  async function approve() {
    setPending(null);
    const r = await fetch("/api/academy/device/approve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ user_code: code }) });
    if (r.status === 401) return setSignedOut(true);
    const j = (await r.json().catch(() => ({}))) as { label?: string | null; error?: string };
    setNote(r.ok ? `Signed in ${j.label ?? "the device"}. Go back to it; it finishes on its own.` : "That code is unknown or has expired. Start again on the device.");
    if (r.ok) setCode("");
    void refresh();
  }

  async function revoke(id: string) {
    const r = await fetch("/api/academy/device/revoke", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ device_id: id }) });
    const j = (await r.json().catch(() => ({}))) as { signed_out_others?: boolean };
    setNote(!r.ok ? "The device could not be signed out." : j.signed_out_others ? "Device signed out. Other sessions were signed out too, so sign in again on your other devices." : "Device signed out, but signing out your other sessions failed. Try again to sign them out.");
    void refresh();
  }

  if (signedOut) {
    return (
      <main className="mx-auto max-w-xl p-6 flex flex-col gap-4">
        <PageHeader eyebrow="devices" title="sign in first" lede="Sign in on this browser, then enter the code your desktop app or terminal shows." />
        <Link href={`/sign-in?next=${encodeURIComponent("/device" + (code ? `?code=${code}` : ""))}`} className={BTN_PRIMARY}>
          sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl p-6 flex flex-col gap-6">
      <PageHeader eyebrow="devices" title="connect a device" lede="Enter the code your desktop app or terminal shows. It then syncs your study progress with this account." />
      <form onSubmit={check} className="flex flex-wrap gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value)} aria-label="device code" autoComplete="off" spellCheck={false} className="flex-1 min-w-[12rem] border border-[color:var(--hairline)] bg-white/70 px-3 py-2 rounded-sm text-[15px] uppercase tracking-[0.2em]" data-testid="device-code" />
        <button type="submit" className={BTN_PRIMARY} disabled={code.trim().length < 8}>
          check
        </button>
      </form>
      {pending && (
        <div className="flex flex-col gap-3 border border-[color:var(--hairline)] p-4" data-testid="device-confirm">
          <p className="text-[14px] text-[color:var(--basalt)]">
            Connect <strong>{pending.label ?? "an unnamed device"}</strong> ({pending.kind}) to your account? Only confirm if you started this on your own device just now.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={approve} className={BTN_PRIMARY}>
              connect
            </button>
            <button type="button" onClick={() => setPending(null)} className={BTN_SECONDARY}>
              cancel
            </button>
          </div>
        </div>
      )}
      {note && <p className="text-[14px] text-[color:var(--basalt-2)]" data-testid="device-note">{note}</p>}
      <section className="flex flex-col gap-2">
        <h2 className="small-caps text-[11px] tracking-[0.2em] text-[color:var(--basalt-3)]">your devices</h2>
        {devices && devices.length === 0 && <p className="text-[14px] text-[color:var(--basalt-3)]">No devices yet.</p>}
        {devices?.map((d) => (
          <div key={d.device_id} className="flex items-center justify-between gap-3 border-b border-[color:var(--hairline)] py-2 text-[14px]">
            <span>
              {d.label ?? d.device_id} <span className="text-[color:var(--basalt-3)]">· {d.kind ?? "device"}</span>
            </span>
            {d.revoked_at ? (
              <span className="text-[12px] text-[color:var(--basalt-3)]">signed out</span>
            ) : (
              <button type="button" onClick={() => revoke(d.device_id)} className={BTN_SECONDARY}>
                sign out
              </button>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}

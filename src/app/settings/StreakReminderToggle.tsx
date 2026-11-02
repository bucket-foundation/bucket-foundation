"use client";

import { useEffect, useState } from "react";

const API = "/api/academy/streak-reminder";

const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

function save(enabled: boolean): Promise<Response> {
  return fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled, tz: browserZone() }) });
}

export default function StreakReminderToggle() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let live = true;
    fetch(API)
      .then((r) => (r.ok ? (r.json() as Promise<{ enabled: boolean; tz: string | null }>) : null))
      .then((s) => {
        if (!live || !s) return;
        setEnabled(s.enabled);
        if (s.enabled && s.tz !== browserZone()) void save(true).catch(() => undefined);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  async function change(next: boolean) {
    setMessage("");
    const res = await save(next).catch(() => null);
    if (res?.ok) {
      setEnabled(next);
      return;
    }
    setMessage(res?.status === 403 ? "Streak reminders are for accounts 18 and over." : "That did not save. Try again in a moment.");
  }

  return (
    <div className="mt-2">
      <label className="flex items-start gap-3 min-h-11 text-[15px] leading-[1.5] text-[color:var(--basalt)]">
        <input type="checkbox" className="mt-1" checked={enabled === true} disabled={enabled === null} onChange={(e) => void change(e.target.checked)} data-settings-streak-reminder />
        <span>Remind me in the evening when my streak is about to end. One email a day at most, plus an app notification if you have them on.</span>
      </label>
      {message && (
        <p role="alert" className="mt-2 text-[14px] text-[color:var(--crimson)]">
          {message}
        </p>
      )}
    </div>
  );
}

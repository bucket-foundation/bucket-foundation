"use client";

import { useCallback, useEffect, useState } from "react";
import { reviewSync } from "@/lib/academy/progress-store";
import { syncView, type SyncView } from "@/lib/academy/sync-status";

export const SYNC_POLL_MS = 3_000;

const isOnline = () => (typeof navigator === "undefined" ? true : navigator.onLine !== false);

export function useSyncStatus(signedIn: boolean): SyncView & { syncNow: () => Promise<void> } {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const read = useCallback(() => {
    setPending(reviewSync.pending().length);
    setOnline(isOnline());
  }, []);

  useEffect(() => {
    read();
    const t = window.setInterval(read, SYNC_POLL_MS);
    window.addEventListener("online", read);
    window.addEventListener("offline", read);
    window.addEventListener("storage", read);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("online", read);
      window.removeEventListener("offline", read);
      window.removeEventListener("storage", read);
    };
  }, [read]);

  const syncNow = useCallback(async () => {
    setSyncing(true);
    try {
      await reviewSync.flush();
    } catch (e) {
      console.error("academy sync now", e);
    } finally {
      setSyncing(false);
      read();
    }
  }, [read]);

  return { ...syncView({ pending, online, syncing, signedIn }), syncNow };
}

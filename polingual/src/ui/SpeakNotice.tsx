"use client";

import { useEffect, useSyncExternalStore } from "react";
import { clearNotice, idle, snapshot, subscribe } from "@/lib/speak";
import s from "./nav.module.css";

export function SpeakNotice() {
  const state = useSyncExternalStore(subscribe, snapshot, idle);
  useEffect(() => {
    if (!state.notice) return;
    const t = window.setTimeout(clearNotice, 4000);
    return () => window.clearTimeout(t);
  }, [state.notice]);
  if (!state.notice) return null;
  return (
    <p className={s.notice} role="status" data-testid="speak-notice">
      {state.notice}
    </p>
  );
}

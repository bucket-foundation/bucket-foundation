"use client";

import { useCallback, useEffect, useState } from "react";
import type { LangCorpus } from "@academy/lang-systems";
import { loadLangCorpus } from "@academy/lang-client";
import { appAuth } from "@/lib/app/auth";
import { dayKey } from "@/lib/daily/rng";
import { bookKey, readLocal, recordResult, type DailyGame, type DailyResult, type SyncDeps } from "@/lib/daily/store";

export const GUEST_SYSTEM = { root: "en", targets: ["es", "fr", "de"] };

export type DailySystem = { root: string; targets: string[] };

function local(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function deps(): SyncDeps {
  return { fetch: window.fetch.bind(window), token: () => appAuth().mobile.accessToken() };
}

async function accountSystem(d: SyncDeps): Promise<DailySystem | null> {
  try {
    const t = await d.token();
    if (!t) return null;
    const r = await d.fetch("/api/academy/progress", { headers: { authorization: `Bearer ${t}` }, cache: "no-store" });
    if (!r.ok) return null;
    const body = (await r.json()) as { branches?: Record<string, { data?: { systems?: DailySystem[] } }> };
    const s = body.branches?.["lang-systems"]?.data?.systems?.[0];
    return s && s.targets?.length ? { root: s.root, targets: s.targets } : null;
  } catch {
    return null;
  }
}

export type DailyState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; corpus: LangCorpus; system: DailySystem; day: string; done: DailyResult | null; signedIn: boolean };

export function useDaily(game: DailyGame) {
  const [state, setState] = useState<DailyState>({ status: "loading" });
  useEffect(() => {
    let live = true;
    void (async () => {
      const d = deps();
      const [corpus, system, signedIn] = await Promise.all([loadLangCorpus(), accountSystem(d), d.token().then(Boolean).catch(() => false)]);
      if (!live) return;
      if (!corpus) return setState({ status: "error" });
      const day = dayKey();
      const done = readLocal(local())[bookKey(game, day)] ?? null;
      setState({ status: "ready", corpus, system: system ?? GUEST_SYSTEM, day, done, signedIn });
    })();
    return () => {
      live = false;
    };
  }, [game]);

  const finish = useCallback(async (result: DailyResult) => {
    setState((s) => (s.status === "ready" ? { ...s, done: result } : s));
    const d = deps();
    await recordResult(result, local(), (await d.token().catch(() => null)) ? d : null);
  }, []);

  return { state, finish };
}

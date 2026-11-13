"use client";

import { useCallback, useEffect, useState } from "react";
import type { LangCorpus } from "@academy/lang-systems";
import { loadLangCorpus } from "@academy/lang-client";
import { appAuth } from "@/lib/app/auth";
import { readBreaks, writeBreaks } from "@/lib/lobby/breaks";
import { dayKey } from "@/lib/daily/rng";
import { bookKey, loadBook, recordResult, type DailyBook, type DailyGame, type DailyResult, type SaveState, type SyncDeps } from "@/lib/daily/store";

export const GUEST_SYSTEM = { root: "en", targets: ["es", "fr", "de"] };

export type DailySystem = { root: string; targets: string[] };

export function local(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function syncDeps(): SyncDeps {
  return { fetch: window.fetch.bind(window), token: () => appAuth().mobile.accessToken().catch(() => null) };
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

export function useDailyBook(): { book: DailyBook; day: string } | null {
  const [state, setState] = useState<{ book: DailyBook; day: string } | null>(null);
  useEffect(() => {
    let live = true;
    void loadBook(local(), syncDeps()).then(({ book }) => live && setState({ book, day: dayKey() }));
    return () => {
      live = false;
    };
  }, []);
  return state;
}

export type DailyState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; corpus: LangCorpus; system: DailySystem; day: string; done: DailyResult | null; signedIn: boolean; saved: SaveState | null };

export function useDaily(game: DailyGame) {
  const [state, setState] = useState<DailyState>({ status: "loading" });
  useEffect(() => {
    let live = true;
    void (async () => {
      const d = syncDeps();
      const signedIn = Boolean(await d.token());
      const [corpus, system, loaded] = await Promise.all([loadLangCorpus(), accountSystem(d), loadBook(local(), d)]);
      const book = loaded.book;
      if (!live) return;
      if (!corpus) return setState({ status: "error" });
      const day = dayKey();
      const done = book[bookKey(game, day)] ?? null;
      setState({ status: "ready", corpus, system: system ?? GUEST_SYSTEM, day, done, signedIn, saved: done ? loaded.source : null });
    })();
    return () => {
      live = false;
    };
  }, [game]);

  const save = useCallback(async (result: DailyResult) => {
    const { book, saved } = await recordResult(result, local(), syncDeps());
    const kept = book[bookKey(result.game, result.day)] ?? result;
    setState((s) => (s.status === "ready" ? { ...s, done: kept, saved } : s));
  }, []);

  const finish = useCallback(
    async (result: Omit<DailyResult, "savedAt">) => {
      const full: DailyResult = { ...result, savedAt: Date.now() };
      const b = readBreaks(local);
      writeBreaks(local, { games: b.games + 1, lastInterstitial: b.lastInterstitial });
      setState((s) => (s.status === "ready" ? { ...s, done: full, saved: null } : s));
      await save(full);
    },
    [save]
  );

  const retry = useCallback(() => {
    if (state.status === "ready" && state.done) void save(state.done);
  }, [state, save]);

  return { state, finish, retry };
}

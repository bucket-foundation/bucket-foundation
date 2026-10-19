"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeState, type EngineState } from "@/lib/academy/engine";
import type { Rating } from "@/lib/academy/fsrs";
import { loadLangCorpus, loadSystems, saveSystems, type SaveResult } from "@/lib/academy/lang-client";
import { applyPlacement, editSystem, gradeCard, progressBranch, type LangCorpus, type LangSystem } from "@/lib/academy/lang-systems";
import { webProgressStore } from "@/lib/academy/progress-store";
import { sharedMemoryOn } from "@/lib/academy/lang-memory";
import { browserMemoryIO, gradeShared, openShared, placeShared, type LangLoadStatus, type SharedSession } from "@/lib/academy/lang-memory-store";

export type LangStatus = "loading" | "ready" | "missing" | "error";

export interface LangSystemHandle {
  status: LangStatus;
  system: LangSystem | null;
  corpus: LangCorpus | null;
  state: EngineState;
  grade: (lang: string, itemId: string, rating: Rating) => void;
  place: (lang: string, tier: number) => void;
  saveState: SaveResult | "idle" | "saving";
  edit: (targets: string[]) => void;
  langStatus: Record<string, LangLoadStatus>;
}

export function useLangSystem(systemId: string): LangSystemHandle {
  const shared = useSharedLangSystem(systemId, sharedMemoryOn());
  const legacy = useLegacyLangSystem(systemId, !sharedMemoryOn());
  return sharedMemoryOn() ? shared : legacy;
}

function useLegacyLangSystem(systemId: string, active: boolean): LangSystemHandle {
  const [status, setStatus] = useState<LangStatus>("loading");
  const [system, setSystem] = useState<LangSystem | null>(null);
  const [corpus, setCorpus] = useState<LangCorpus | null>(null);
  const [state, setState] = useState<EngineState>(() => normalizeState(null));
  const stateRef = useRef(state);
  stateRef.current = state;
  const systemsRef = useRef<LangSystem[]>([]);
  const [saveState, setSaveState] = useState<SaveResult | "idle" | "saving">("idle");

  useEffect(() => {
    if (!active) return;
    let alive = true;
    (async () => {
      try {
        const server = await webProgressStore.pull();
        const [c, systems] = await Promise.all([loadLangCorpus(), loadSystems(server)]);
        const sys = systems.find((s) => s.id === systemId) ?? null;
        if (!alive) return;
        if (!c || !sys) {
          setStatus("missing");
          return;
        }
        systemsRef.current = systems;
        const s = await webProgressStore.load(progressBranch(sys), server);
        if (!alive) return;
        setCorpus(c);
        setSystem(sys);
        setState(s);
        setStatus("ready");
      } catch {
        if (alive) setStatus("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [systemId, active]);

  const commit = useCallback(
    (next: EngineState) => {
      if (!system) return;
      stateRef.current = next;
      setState(next);
      webProgressStore.save(progressBranch(system), next);
    },
    [system]
  );

  const grade = useCallback((lang: string, itemId: string, rating: Rating) => commit(gradeCard(stateRef.current, lang, itemId, rating)), [commit]);

  const place = useCallback(
    (lang: string, tier: number) => {
      if (!system || !corpus) return;
      const nextSystem = { ...system, placement: { ...system.placement, [lang]: tier } };
      setSystem(nextSystem);
      setSaveState("saving");
      void saveSystems({ upsert: nextSystem }).then((r) => {
        systemsRef.current = r.systems;
        setSaveState(r.result);
      });
      commit(applyPlacement(stateRef.current, nextSystem, corpus, lang, tier));
    },
    [system, corpus, commit]
  );

  const edit = useCallback(
    (targets: string[]) => {
      if (!system) return;
      const next = editSystem(system, targets);
      setSystem(next);
      setSaveState("saving");
      void saveSystems({ upsert: next }).then((r) => {
        systemsRef.current = r.systems;
        setSaveState(r.result);
      });
    },
    [system]
  );

  return { status, system, corpus, state, grade, place, saveState, edit, langStatus: {} };
}

function useSharedLangSystem(systemId: string, active: boolean): LangSystemHandle {
  const [status, setStatus] = useState<LangStatus>("loading");
  const [corpus, setCorpus] = useState<LangCorpus | null>(null);
  const [session, setSession] = useState<SharedSession | null>(null);
  const ref = useRef<SharedSession | null>(null);
  ref.current = session;
  const [saveState, setSaveState] = useState<SaveResult | "idle" | "saving">("idle");
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    (async () => {
      try {
        const server = await webProgressStore.pull();
        const [c, systems] = await Promise.all([loadLangCorpus(), loadSystems(server)]);
        const sys = systems.find((s) => s.id === systemId) ?? null;
        if (!alive) return;
        if (!c || !sys) {
          setStatus("missing");
          return;
        }
        const s = await openShared(browserMemoryIO, sys, systems, server);
        if (!alive) return;
        setCorpus(c);
        setSession(s);
        setStatus(Object.values(s.langStatus).some((x) => x === "ready") ? "ready" : "error");
      } catch {
        if (alive) setStatus("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [systemId, active, epoch]);

  const grade = useCallback((lang: string, itemId: string, rating: Rating) => {
    if (!ref.current) return;
    const { session: next } = gradeShared(browserMemoryIO, ref.current, lang, itemId, rating);
    ref.current = next;
    setSession(next);
  }, []);

  const place = useCallback(
    (lang: string, tier: number) => {
      if (!ref.current || !corpus) return;
      const r = placeShared(browserMemoryIO, ref.current, corpus, lang, tier);
      ref.current = r.session;
      setSession(r.session);
      setSaveState("saving");
      void saveSystems({ upsert: r.system }).then((x) => setSaveState(x.result));
    },
    [corpus]
  );

  const edit = useCallback((targets: string[]) => {
    if (!ref.current) return;
    const next = editSystem(ref.current.system, targets);
    setSaveState("saving");
    void saveSystems({ upsert: next }).then((x) => {
      setSaveState(x.result);
      setEpoch((e) => e + 1);
    });
  }, []);

  return {
    status,
    system: session?.plan ?? null,
    corpus,
    state: session?.view ?? EMPTY,
    grade,
    place,
    saveState,
    edit,
    langStatus: session?.langStatus ?? {},
  };
}

const EMPTY = normalizeState(null);

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeState, type EngineState } from "@/lib/academy/engine";
import type { Rating } from "@/lib/academy/fsrs";
import { loadLangCorpus, loadSystems, saveSystems, type SaveResult } from "@/lib/academy/lang-client";
import { applyPlacement, editSystem, gradeCard, progressBranch, type LangCorpus, type LangSystem } from "@/lib/academy/lang-systems";
import { webProgressStore } from "@/lib/academy/progress-store";

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
}

export function useLangSystem(systemId: string): LangSystemHandle {
  const [status, setStatus] = useState<LangStatus>("loading");
  const [system, setSystem] = useState<LangSystem | null>(null);
  const [corpus, setCorpus] = useState<LangCorpus | null>(null);
  const [state, setState] = useState<EngineState>(() => normalizeState(null));
  const stateRef = useRef(state);
  stateRef.current = state;
  const systemsRef = useRef<LangSystem[]>([]);
  const [saveState, setSaveState] = useState<SaveResult | "idle" | "saving">("idle");

  useEffect(() => {
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
  }, [systemId]);

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

  return { status, system, corpus, state, grade, place, saveState, edit };
}

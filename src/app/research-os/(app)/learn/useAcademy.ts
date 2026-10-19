"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildEncompassingMap, grade, masteryFor, normalizeState, route, summary, type Atom, type Depth, type EncEdge, type EngineState, type RouteItem, type Summary } from "@/lib/academy/engine";
import type { Rating } from "@/lib/academy/fsrs";
import { loadCorpus, type LoadedCorpus } from "@/lib/academy/corpus-client";
import { webProgressStore, type ProgressStore } from "@/lib/academy/progress-store";
import { corpusAtomsVersion } from "@/lib/academy/replay";
import { guestMayGrade } from "@/lib/academy/guest-merge";
import { useAccountGate } from "@/lib/academy/account-gate-context";

export type AcademyStatus = "loading" | "ready" | "missing" | "error";

export interface Academy {
  status: AcademyStatus;
  corpus: LoadedCorpus | null;
  byId: Map<string, Atom>;
  state: EngineState;
  encompassing: Record<string, EncEdge[]>;
  routeItems: RouteItem[];
  summaryNow: Summary;
  mastery: (id: string) => number;
  gradeAtom: (id: string, rating: Rating, level: Depth) => void;
}

export function useAcademy(branch: string, store: ProgressStore = webProgressStore): Academy {
  const [status, setStatus] = useState<AcademyStatus>("loading");
  const [corpus, setCorpus] = useState<LoadedCorpus | null>(null);
  const [state, setState] = useState<EngineState>(() => normalizeState(null));
  const stateRef = useRef(state);
  stateRef.current = state;
  const { guest, requireAccount } = useAccountGate();

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    Promise.all([loadCorpus(branch), store.load(branch)])
      .then(([c, s]) => {
        if (!alive) return;
        if (!c) {
          setStatus("missing");
          return;
        }
        setCorpus(c);
        setState(s);
        setStatus("ready");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [branch, store]);

  const atoms = useMemo(() => corpus?.atoms ?? [], [corpus]);
  const byId = useMemo(() => new Map(atoms.map((a) => [a.id, a])), [atoms]);
  const encompassing = useMemo(() => buildEncompassingMap(atoms), [atoms]);
  const routeItems = useMemo(() => route(state, atoms), [state, atoms]);
  const summaryNow = useMemo(() => summary(state, atoms), [state, atoms]);
  const mastery = useCallback((id: string) => masteryFor(state, id), [state]);

  const gradeAtom = useCallback(
    (id: string, rating: Rating, level: Depth) => {
      const apply = () => {
        const now = Date.now();
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        store.appendReview?.(branch, { card_id: id, rating, level, reviewed_at: now, tz, atoms_version: corpusAtomsVersion(branch) });
        const next = grade(stateRef.current, atoms, encompassing, id, rating, level, now, tz);
        stateRef.current = next;
        setState(next);
        store.save(branch, next);
      };
      if (guest && !guestMayGrade(branch, stateRef.current.cards, id)) requireAccount(apply);
      else apply();
    },
    [atoms, encompassing, branch, store, guest, requireAccount]
  );

  return { status, corpus, byId, state, encompassing, routeItems, summaryNow, mastery, gradeAtom };
}

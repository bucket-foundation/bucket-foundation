"use client";

import { useCallback, useEffect, useState } from "react";
import { loadSystems, saveSystems, type SaveResult } from "@academy/lang-client";
import { createSystem, type LangSystem } from "@academy/lang-systems";

export type SystemsState = { status: "loading" } | { status: "error" } | { status: "ready"; systems: LangSystem[] };

export function useSystems() {
  const [state, setState] = useState<SystemsState>({ status: "loading" });

  const reload = useCallback(async () => {
    try {
      setState({ status: "ready", systems: await loadSystems() });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(
    async (root: string, targets: string[]): Promise<{ system: LangSystem; result: SaveResult }> => {
      const existing = state.status === "ready" ? state.systems : [];
      const system = createSystem(root, targets, existing);
      const r = await saveSystems({ upsert: system });
      setState({ status: "ready", systems: r.systems });
      return { system, result: r.result };
    },
    [state]
  );

  return { state, reload, create };
}

"use client";

import { useEffect } from "react";
import { radioExposures } from "@academy/listen-input";
import { useLangSystem } from "@learn/languages/useLangSystem";
import { usePlayer, type Heard } from "@/lib/listen/player";
import { useSystems } from "../useSystems";

const unknown = () => 0;

function Flush({ systemId }: { systemId: string }) {
  const h = useLangSystem(systemId);
  const { heard, takeHeard } = usePlayer();
  const { logExposures, langStatus } = h;

  useEffect(() => {
    if (!logExposures) return;
    const ready = (x: Heard) => langStatus[x.lang] === "ready";
    if (!heard.some(ready)) return;
    for (const x of takeHeard(ready)) logExposures(x.lang, radioExposures(x.stationId, x.startedAt, x.ms, unknown));
  }, [heard, takeHeard, logExposures, langStatus]);

  return null;
}

export default function RadioLog() {
  const { heard, takeHeard } = usePlayer();
  const { state } = useSystems();
  const first = heard[0];
  const system = state.status === "ready" && first ? state.systems.find((s) => s.targets.includes(first.lang)) : undefined;

  useEffect(() => {
    if (state.status === "ready" && first && !system) takeHeard((x) => x === first);
  }, [state.status, first, system, takeHeard]);

  return system ? <Flush key={system.id} systemId={system.id} /> : null;
}

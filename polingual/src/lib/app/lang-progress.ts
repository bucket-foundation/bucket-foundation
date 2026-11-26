import type { LangMemory } from "@academy/lang-memory";
import { memoryState } from "@academy/lang-memory";
import { inputDays, langMetrics, type LangMetrics } from "@academy/progress-metric";

export interface LangProgress extends LangMetrics {
  lang: string;
}

export function langProgress(memories: readonly LangMemory[], now: number): { langs: LangProgress[]; inputDays: string[] } {
  const langs: LangProgress[] = [];
  const days = new Set<string>();
  for (const m of memories) {
    langs.push({ lang: m.lang, ...langMetrics(m.lang, memoryState(m).cards, m.log, now) });
    for (const d of inputDays(m.log, m.lang)) days.add(d);
  }
  return { langs, inputDays: Array.from(days).sort() };
}

export function hoursText(h: number): string {
  return h.toFixed(1);
}

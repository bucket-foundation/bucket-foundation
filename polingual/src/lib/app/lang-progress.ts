import type { LangMemory } from "@academy/lang-memory";
import { memoryState } from "@academy/lang-memory";
import { inputDays, langMetrics, type LangMetrics } from "@academy/progress-metric";
import { heldFromCards, type CognateIndex } from "@academy/cognate-coverage";

export interface LangProgress extends LangMetrics {
  lang: string;
}

export function langProgress(memories: readonly LangMemory[], now: number, cognates: Readonly<Record<string, CognateIndex>> = {}): { langs: LangProgress[]; inputDays: string[] } {
  const langs: LangProgress[] = [];
  const days = new Set<string>();
  const states = memories.map((m) => memoryState(m).cards);
  const held = heldFromCards(Object.assign({}, ...states), now);
  memories.forEach((m, i) => {
    const index = cognates[m.lang];
    langs.push({ lang: m.lang, ...langMetrics(m.lang, states[i], m.log, now, 0, index ? { index, held } : undefined) });
    for (const d of inputDays(m.log, m.lang)) days.add(d);
  });
  return { langs, inputDays: Array.from(days).sort() };
}

export function hoursText(h: number): string {
  return h.toFixed(1);
}

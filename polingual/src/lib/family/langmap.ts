import type { PlayerCard, SpeakLevel } from "./card";

export interface SeatCard {
  userId: string;
  name: string;
  card: Pick<PlayerCard, "speaks" | "learn" | "surprise">;
}

export interface LangCount {
  lang: string;
  count: number;
}

export interface RoomLangMap {
  people: { userId: string; name: string; speaks: { lang: string; level: SpeakLevel }[]; learn: string[] }[];
  shared: LangCount[];
  wanted: LangCount[];
  teachers: LangCount[];
}

function counted(m: Map<string, number>, min: number): LangCount[] {
  return [...m.entries()].filter(([, c]) => c >= min).map(([lang, count]) => ({ lang, count })).sort((a, b) => b.count - a.count || a.lang.localeCompare(b.lang));
}

function bump(m: Map<string, number>, k: string) {
  m.set(k, (m.get(k) ?? 0) + 1);
}

export function roomLanguageMap(seats: readonly SeatCard[]): RoomLangMap {
  const spoken = new Map<string, number>();
  const wanted = new Map<string, number>();
  const home = new Map<string, number>();
  for (const s of seats) {
    for (const sp of s.card.speaks) {
      bump(spoken, sp.lang);
      if (sp.level === 4) bump(home, sp.lang);
    }
    for (const l of s.card.learn) bump(wanted, l);
  }
  return {
    people: seats.map((s) => ({ userId: s.userId, name: s.name, speaks: s.card.speaks.map(({ lang, level }) => ({ lang, level })), learn: s.card.learn })),
    shared: counted(spoken, Math.min(2, Math.max(1, seats.length))),
    wanted: counted(wanted, 1),
    teachers: counted(home, 1),
  };
}

export function suggestedRound(map: RoomLangMap): string | null {
  const teach = new Set(map.teachers.map((t) => t.lang));
  return map.wanted.find((w) => teach.has(w.lang))?.lang ?? map.wanted[0]?.lang ?? null;
}

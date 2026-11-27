export const QUEST_GAMES = 5;
export const ROOMS_BRANCH = "polingual-rooms";

interface RoomEntry {
  key?: unknown;
  day?: unknown;
  xp?: unknown;
}

export function weekStartDay(now: number): string {
  const d = new Date(now);
  const back = (d.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back)).toISOString().slice(0, 10);
}

function roomsOf(data: unknown): RoomEntry[] {
  const rooms = (data as { rooms?: Record<string, RoomEntry> } | null)?.rooms;
  return rooms && typeof rooms === "object" ? Object.values(rooms) : [];
}

export interface QuestResult {
  goal: number;
  done: number;
  weekStart: string;
  xp: Record<string, number>;
}

export function familyQuest(branches: readonly { user_id: string; data: unknown }[], now: number): QuestResult {
  const weekStart = weekStartDay(now);
  const players = new Map<string, Set<string>>();
  const xp: Record<string, number> = {};
  for (const b of branches) {
    for (const r of roomsOf(b.data)) {
      if (typeof r.key !== "string" || typeof r.day !== "string" || r.day < weekStart) continue;
      const room = r.key;
      players.set(room, (players.get(room) ?? new Set()).add(b.user_id));
      xp[b.user_id] = (xp[b.user_id] ?? 0) + (typeof r.xp === "number" && r.xp > 0 ? Math.min(r.xp, 100_000) : 0);
    }
  }
  const together = Array.from(players.values()).filter((s) => s.size >= 2).length;
  return { goal: QUEST_GAMES, done: Math.min(QUEST_GAMES, together), weekStart, xp };
}

import { randomInt } from "node:crypto";

export const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const CODE = /^[0-9A-HJKMNP-TV-Z]{6}$/;
const IP = /^[0-9a-fA-F:.]{2,45}$/;
const GRACE_CAP_MS = 1000;
export type SummaryRow = { nickname: string; team?: number | null; points: number; correct: number };
const TEAM_NAMES = ["Lapis", "Vermilion", "Malachite", "Ochre"] as const;

export function clientIpFrom(headers: { get(name: string): string | null }): string | null {
  const real = headers.get("x-real-ip")?.trim();
  return real && IP.test(real) ? real : null;
}

export function newCode(random: (max: number) => number = randomInt): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[random(CODE_ALPHABET.length)];
  return s;
}

export function parseMode(b: Record<string, unknown>): { mode: "open_floor" } | { mode: "chorus"; teams: number } | null {
  const mode = b.mode ?? "open_floor";
  if (mode === "open_floor") return { mode };
  if (mode !== "chorus") return null;
  const teams = b.teams ?? 2;
  return Number.isInteger(teams) && (teams as number) >= 2 && (teams as number) <= 4 ? { mode, teams: teams as number } : null;
}

export function medianGrace(samples: unknown): number | null {
  if (!Array.isArray(samples)) return null;
  const delays = samples
    .slice(0, 20)
    .map((s) => (s && typeof s === "object" ? Number((s as Record<string, unknown>).received_at) - Number((s as Record<string, unknown>).sent_at) : NaN))
    .filter((d) => Number.isFinite(d))
    .sort((a, b) => a - b);
  if (delays.length < 3) return null;
  const mid = delays.length >> 1;
  const m = delays.length % 2 ? delays[mid] : (delays[mid - 1] + delays[mid]) / 2;
  return Math.round(Math.min(GRACE_CAP_MS, Math.max(0, m)));
}

export function networkOf(ip: string | null): string {
  const raw = (ip ?? "").trim().toLowerCase();
  if (!raw) return "unknown";
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(raw);
  if (mapped) return mapped[1];
  if (!raw.includes(":")) return raw;
  const [head, tail] = raw.split("::");
  const left = head ? head.split(":") : [];
  const right = tail !== undefined && tail ? tail.split(":") : [];
  const groups = tail === undefined ? left : [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill("0"), ...right];
  return `${groups.slice(0, 4).map((g) => (g.replace(/^0+(?=.)/, "") || "0")).join(":")}::/64`;
}

export function summaryCsv(rows: SummaryRow[], chorus = false): string {
  const lines = [chorus ? "rank,nickname,team,points,correct" : "rank,nickname,points,correct"];
  const points = rows.map((r) => Math.trunc(Number(r.points) || 0));
  rows.forEach((r, i) => {
    const name = /^[a-z]+-[a-z]+$/.test(r.nickname) ? r.nickname : "";
    const rank = points.filter((p) => p > points[i]).length + 1;
    const team = chorus ? [TEAM_NAMES[r.team ?? -1] ?? ""] : [];
    lines.push([rank, name, ...team, points[i], Math.trunc(Number(r.correct) || 0)].join(","));
  });
  return lines.join("\r\n") + "\r\n";
}

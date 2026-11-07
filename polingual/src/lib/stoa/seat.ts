export type Seat = { room_id: string; player_id: string; token: string; code: string; exp: number };
export type SeatStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const SEATS_KEY = "stoa/seats/v1";
export const MAX_SEATS = 4;
const CODE = /^[0-9A-HJKMNP-TV-Z]{6}$/;

export function tokenExpiry(token: string): number | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const claims = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: unknown };
    return Number.isSafeInteger(claims.exp) ? (claims.exp as number) * 1000 : null;
  } catch {
    return null;
  }
}

function isSeat(v: unknown): v is Seat {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return typeof s.room_id === "string" && typeof s.player_id === "string" && typeof s.token === "string" && typeof s.code === "string" && CODE.test(s.code) && Number.isSafeInteger(s.exp);
}

export function readSeats(store: SeatStore | null, now: number): Seat[] {
  if (!store) return [];
  try {
    const raw = JSON.parse(store.getItem(SEATS_KEY) ?? "[]") as unknown;
    return Array.isArray(raw) ? raw.filter(isSeat).filter((s) => s.exp > now) : [];
  } catch {
    return [];
  }
}

function write(store: SeatStore | null, seats: Seat[]): void {
  if (!store) return;
  try {
    if (seats.length) store.setItem(SEATS_KEY, JSON.stringify(seats));
    else store.removeItem(SEATS_KEY);
  } catch {
    return;
  }
}

export function findSeat(store: SeatStore | null, code: string | null, now: number): Seat | null {
  const seats = readSeats(store, now);
  write(store, seats);
  if (code) return seats.find((s) => s.code === code) ?? null;
  return seats.length === 1 ? seats[0] : null;
}

export function keepSeat(store: SeatStore | null, seat: Omit<Seat, "exp">, now: number): Seat {
  const kept = { ...seat, exp: tokenExpiry(seat.token) ?? now + 3 * 3_600_000 };
  write(store, [kept, ...readSeats(store, now).filter((s) => s.room_id !== seat.room_id && s.code !== seat.code)].slice(0, MAX_SEATS));
  return kept;
}

export function dropSeat(store: SeatStore | null, roomId: string, now: number): void {
  write(store, readSeats(store, now).filter((s) => s.room_id !== roomId));
}

export function seatStore(): SeatStore | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

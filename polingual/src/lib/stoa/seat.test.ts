import { test } from "node:test";
import assert from "node:assert/strict";
import { dropSeat, findSeat, keepSeat, MAX_SEATS, readSeats, SEATS_KEY, tokenExpiry, type SeatStore } from "./seat";

const NOW = 1_800_000_000_000;

function memory(): SeatStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

function token(expSeconds: number): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ typ: "player", exp: expSeconds })}.sig`;
}

const seat = (code: string, room: string, expMs = NOW + 3_600_000) => ({ room_id: room, player_id: `p-${room}`, token: token(Math.floor(expMs / 1000)), code });

test("the seat lives until the room token expires", () => {
  assert.equal(tokenExpiry(token(1_800_003_600)), 1_800_003_600_000);
  assert.equal(tokenExpiry("junk"), null);
  const store = memory();
  keepSeat(store, seat("QZ7K2M", "r1"), NOW);
  assert.equal(findSeat(store, "QZ7K2M", NOW + 1000)?.room_id, "r1", "a reload or a killed tab finds the seat by code");
  assert.equal(findSeat(store, null, NOW + 1000)?.room_id, "r1", "/join with no code resumes the only seat");
  assert.equal(findSeat(store, "QZ7K2M", NOW + 3_600_001), null, "an expired seat is gone");
  assert.equal(store.data.has(SEATS_KEY), false, "expired seats are pruned from storage");
});

test("seats are per room, capped, and dropped on leave", () => {
  const store = memory();
  for (let i = 0; i < 6; i++) keepSeat(store, seat(`QZ7K2${i}`, `r${i}`), NOW + i);
  const seats = readSeats(store, NOW);
  assert.equal(seats.length, MAX_SEATS);
  assert.equal(seats[0].room_id, "r5", "the newest seat comes first");
  assert.equal(findSeat(store, null, NOW), null, "with several seats, /join asks for a code");
  keepSeat(store, { ...seat("QZ7K25", "r5"), token: token(Math.floor(NOW / 1000) + 60) }, NOW);
  assert.equal(readSeats(store, NOW).filter((s) => s.room_id === "r5").length, 1, "a reissued token replaces the seat");
  dropSeat(store, "r5", NOW);
  assert.equal(findSeat(store, "QZ7K25", NOW), null);
});

test("broken storage never breaks the phone", () => {
  const store = memory();
  store.data.set(SEATS_KEY, "{not json");
  assert.deepEqual(readSeats(store, NOW), []);
  store.data.set(SEATS_KEY, JSON.stringify([{ room_id: 1 }, null]));
  assert.deepEqual(readSeats(store, NOW), []);
  const throwing: SeatStore = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); }, removeItem: () => { throw new Error("denied"); } };
  assert.equal(findSeat(throwing, "QZ7K2M", NOW), null);
  assert.equal(keepSeat(throwing, seat("QZ7K2M", "r1"), NOW).room_id, "r1");
  assert.equal(findSeat(null, "QZ7K2M", NOW), null);
});

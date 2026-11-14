import { clockOffset, type Snapshot } from "@/lib/stoa/client";
import { openedSnap, refetchDelay, type OpenPayload } from "@/lib/stoa/phone";
import { dropSeat, keepSeat, seatStore, type Seat } from "@/lib/stoa/seat";
import { LiveSocket, type SocketStatus } from "@/lib/stoa/socket";
import { verifyEvent } from "@/lib/stoa/verify";

export type Bag = {
  seat: Seat | null;
  seq: number;
  offset: number;
  socket: LiveSocket | null;
  samples: { sent_at: number; received_at: number }[];
  lastFail: number;
  alive: boolean;
  snap: Snapshot | null;
  onEvent: (p: unknown) => Promise<void>;
};

export type Setters = {
  setSeat: (s: Seat | null) => void;
  setSnap: (s: Snapshot | null | ((p: Snapshot | null) => Snapshot | null)) => void;
  setStatus: (s: SocketStatus) => void;
  setVerified: (f: (n: number) => number) => void;
  leave: (message?: string) => void;
};

export function saveSeat(s: Omit<Seat, "exp">): Seat {
  return keepSeat(seatStore(), s, Date.now());
}

export function newBag(): Bag {
  return { seat: null, seq: 0, offset: 0, socket: null, samples: [], lastFail: 0, alive: true, snap: null, onEvent: async () => {} };
}

export async function fetchSnapshot(b: Bag, set: Setters) {
  const s = b.seat;
  if (!s) return;
  const sent = Date.now();
  let r: Response;
  try {
    r = await fetch(`/api/live/rooms/${s.room_id}/state`, { headers: { authorization: `Bearer ${s.token}` }, cache: "no-store" });
  } catch {
    return;
  }
  if (!b.alive) return;
  if (r.status === 401 || r.status === 403 || r.status === 404) return set.leave(r.status === 403 ? "The host removed you from this room." : "That room has ended.");
  if (!r.ok) return;
  const body = (await r.json()) as Snapshot;
  if (!b.alive || b.seat?.room_id !== s.room_id) return;
  b.offset = clockOffset(sent, Date.now(), body.server_now);
  if (body.token) {
    const next = saveSeat({ ...s, token: body.token });
    b.seat = next;
    set.setSeat(next);
  }
  b.seq = Math.max(b.seq, body.room.seq);
  if (body.room.phase === "closed") dropSeat(seatStore(), s.room_id, Date.now());
  set.setSnap(body);
  if (!b.socket) {
    b.socket = new LiveSocket(body.realtime, (p) => void b.onEvent(p), set.setStatus);
    b.socket.start();
  } else b.socket.retarget(body.realtime);
}

export async function report(b: Bag, extra: Record<string, unknown>) {
  const s = b.seat;
  if (!s) return;
  await fetch("/api/live/probe", { method: "POST", headers: { authorization: `Bearer ${s.token}`, "content-type": "application/json" }, body: JSON.stringify(extra) }).catch(() => undefined);
}

export async function handleEvent(b: Bag, set: Setters, refetch: () => void, payload: unknown) {
  const s = b.seat;
  const key = b.snap?.room.verify_key;
  if (!s || !key) return;
  const v = await verifyEvent(payload, { roomId: s.room_id, lastSeq: b.seq, publicKey: key, now: Date.now(), clockOffsetMs: b.offset });
  if (!v.ok) {
    if (v.reason !== "seq" && Date.now() - b.lastFail > 15_000) {
      b.lastFail = Date.now();
      void report(b, { failed: true });
    }
    return;
  }
  const gap = v.seq > b.seq + 1;
  b.seq = v.seq;
  set.setVerified((n) => n + 1);
  if (v.type === "probe") {
    b.samples.push({ sent_at: v.issuedAt, received_at: Date.now() + b.offset });
    if (b.samples.length === 3) void report(b, { samples: b.samples });
    return;
  }
  if (v.type === "open" && !gap) {
    set.setSnap((prev) => openedSnap(prev, v.payload as OpenPayload, v.seq));
    return;
  }
  setTimeout(refetch, refetchDelay(v.type, Math.random));
}

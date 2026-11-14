"use client";

import { type FormEvent } from "react";
import { joinError } from "@/lib/stoa/client";
import { nicknameChoices } from "@/lib/stoa/nicknames";
import { answerError } from "@/lib/stoa/phone";
import { dropSeat, findSeat, seatStore, type Seat } from "@/lib/stoa/seat";
import { buzz } from "@/lib/stoa/stage";
import { saveSeat } from "./session";
import type { PhoneSession } from "./usePhoneSession";

type Deps = {
  p: PhoneSession;
  code: string;
  setNames: (n: string[]) => void;
  setBack: (s: Seat | null) => void;
  setBusy: (b: boolean) => void;
  lock: () => void;
};

export function usePhoneActions(d: Deps) {
  const { p, code } = d;
  const submitCode = (e: FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return p.setError(joinError("code"));
    p.setError(null);
    d.setBack(findSeat(seatStore(), code, Date.now()));
    p.setStep("name");
  };
  const resume = (s: Seat) => {
    d.setBack(null);
    p.sit(s);
  };
  const fresh = (s: Seat) => {
    dropSeat(seatStore(), s.room_id, Date.now());
    d.setBack(null);
    p.setStep("name");
  };
  return { submitCode, resume, fresh, join: (nickname: string) => join(d, nickname), answer: (choice: number) => answer(d, choice) };
}

async function join(d: Deps, nickname: string) {
  const { p, code } = d;
  d.setBusy(true);
  p.setError(null);
  try {
    const r = await fetch("/api/live/join", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code, nickname }) });
    const body = (await r.json()) as { error?: string; room_id: string; player_id: string; token: string };
    if (!r.ok) {
      p.setError(joinError(body.error));
      if (body.error === "name_taken") d.setNames(nicknameChoices(Math.random));
      if (body.error === "no_room" || body.error === "code") p.setStep("code");
      return;
    }
    p.sit(saveSeat({ room_id: body.room_id, player_id: body.player_id, token: body.token, code, nickname }));
  } catch {
    p.setError(joinError("offline"));
  } finally {
    d.setBusy(false);
  }
}

async function answer(d: Deps, choice: number) {
  const { p } = d;
  const s = p.bag.seat;
  const q = p.snap?.question;
  if (!s || !q || p.snap?.player?.choice != null) return;
  d.lock();
  buzz(30);
  p.setSnap((prev) => (prev && prev.player ? { ...prev, player: { ...prev.player, choice } } : prev));
  const r = await fetch("/api/live/answer", { method: "POST", headers: { authorization: `Bearer ${s.token}`, "content-type": "application/json" }, body: JSON.stringify({ idx: q.idx, choice }) }).catch(() => null);
  if (!r || !r.ok) {
    const body = r ? ((await r.json().catch(() => ({}))) as { error?: string }) : {};
    const message = answerError(body.error);
    if (message === null) return;
    p.setError(message);
    if (body.error === "stale_token") void p.fetchState();
  }
}

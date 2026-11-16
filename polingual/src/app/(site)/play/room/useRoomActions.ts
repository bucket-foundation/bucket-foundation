"use client";

import { useRouter } from "next/navigation";
import { answeredRound, LobbyError, shareUrl, type LobbyApi, type WebLobbyState } from "@/lib/lobby/client";
import type { Picked } from "@/lib/lobby/room";
import { play, writeMuted } from "@/lib/lobby/sound";
import type { usePlay } from "../usePlay";
import { errorOf } from "./useRoomSync";

type Deps = {
  api: LobbyApi;
  state: ReturnType<typeof usePlay>["state"];
  lobby: WebLobbyState | null;
  picked: Picked | null;
  setPicked: (p: Picked | null | ((p: Picked | null) => Picked | null)) => void;
  muted: boolean;
  setMuted: (m: boolean) => void;
  busy: boolean;
  setBusy: (b: boolean) => void;
  setCopied: (c: boolean) => void;
  take: (l: WebLobbyState, sentAt: number) => void;
  setError: (e: string | null) => void;
};

export function useRoomActions(d: Deps) {
  const router = useRouter();
  const act = async (fn: () => Promise<WebLobbyState>) => {
    const sentAt = Date.now();
    try {
      d.take(await fn(), sentAt);
      d.setError(null);
    } catch (err) {
      d.setError(errorOf(err));
    }
  };
  const toggleMute = () => {
    writeMuted(() => window.localStorage, !d.muted);
    d.setMuted(!d.muted);
  };
  const leave = async () => {
    if (!d.lobby) return;
    try {
      await d.api.leave(d.lobby.id);
    } catch {
    }
    router.push("/play");
  };
  return { act, answer: (round: number, choice: string) => answer(d, round, choice), toggleMute, newLobby: (bots: boolean) => newLobby(d, router.push, bots), leave, share: () => share(d) };
}

async function answer(d: Deps, round: number, choice: string) {
  const lobby = d.lobby;
  if (!lobby) return;
  if ((d.picked?.round === round && d.picked.game === lobby.startedAt) || answeredRound(lobby, round)) return;
  const game = lobby.startedAt;
  d.setPicked({ game, round, choice, correct: false, points: 0, pending: true });
  const sentAt = Date.now();
  try {
    const res = await d.api.answer(lobby.id, round, choice);
    d.setPicked({ game, round, choice, correct: res.correct, points: res.points });
    play(res.correct ? "hit" : "miss", d.muted);
    d.take(res.lobby, sentAt);
  } catch (err) {
    if (!(err instanceof LobbyError && err.code === "already_answered")) d.setPicked((p) => (p?.round === round ? null : p));
    d.setError(errorOf(err));
  }
}

async function newLobby(d: Deps, push: (href: string) => void, bots: boolean) {
  const { state, lobby, api } = d;
  if (state.status !== "ready" || d.busy || !lobby) return;
  d.setBusy(true);
  try {
    const created = await api.create({ name: `${state.nickname}'s lobby`, root: lobby.root, targets: lobby.targets, rounds: lobby.rounds, roundSeconds: lobby.roundSeconds, listed: true, displayName: state.nickname, game: lobby.game, fillBots: bots });
    if (bots) await api.fillBots(created.id).catch(() => undefined);
    push(`/play/${created.code}`);
  } catch (err) {
    d.setError(errorOf(err));
    d.setBusy(false);
  }
}

async function share(d: Deps) {
  if (!d.lobby) return;
  const url = shareUrl(window.location.origin, d.lobby.code);
  try {
    if (navigator.share) await navigator.share({ title: "Polingual lobby", text: `Join my Polingual lobby with code ${d.lobby.code}`, url });
    else {
      await navigator.clipboard.writeText(url);
      d.setCopied(true);
    }
  } catch {
  }
}

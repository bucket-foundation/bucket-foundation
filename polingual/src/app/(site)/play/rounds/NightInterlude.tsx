"use client";

import { useEffect, useState } from "react";
import type { WebLobbyState } from "@/lib/lobby/client";
import { fetchTrivia, type ScreenRole } from "@/lib/family/rounds";
import { roomInterlude } from "@/lib/lobby/waiting";
import { Button } from "@/ui";
import { AtlasInterlude } from "./AtlasInterlude";
import { ForeheadInterlude } from "./ForeheadInterlude";
import { FAMILY_TEACH, OUR_TRIVIA } from "./index";

export function useTriviaReady(lobbyId: string, token: string | null): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!token) return;
    let stop = false;
    void fetchTrivia(fetch.bind(globalThis), token, lobbyId).then((r) => {
      if (!stop) setReady(r.ok && (r.data.trivia?.count ?? 0) > 0);
    });
    return () => {
      stop = true;
    };
  }, [lobbyId, token]);
  return ready;
}

export function NightInterlude({ lobby, token, role, now }: { lobby: WebLobbyState; token: string | null; role: ScreenRole; now: number }) {
  const slot = roomInterlude(lobby, now);
  const trivia = useTriviaReady(lobby.id, slot?.kind === "our-trivia" ? token : null);
  if (slot?.kind === "voice-atlas") return <AtlasInterlude lobby={lobby} token={token} role={role} now={now} slot={slot} />;
  if (slot?.kind === "forehead") return <ForeheadInterlude lobby={lobby} token={token} role={role} now={now} slot={slot} />;
  if (slot?.kind === "family-teach") return <FAMILY_TEACH.Round lobby={lobby} token={token} role={role} />;
  if (slot?.kind === "our-trivia" && trivia) return <OUR_TRIVIA.Round lobby={lobby} token={token} role={role} />;
  return null;
}

export function TriviaWriter({ lobby, token }: { lobby: WebLobbyState; token: string | null }) {
  const [open, setOpen] = useState(false);
  if (!lobby.isHost) return null;
  return open ? (
    <OUR_TRIVIA.Round lobby={lobby} token={token} role="phone" />
  ) : (
    <Button variant="quiet" size="sm" onClick={() => setOpen(true)} data-testid="write-trivia">
      Write Our Trivia questions
    </Button>
  );
}

"use client";

import type { CSSProperties } from "react";
import { phaseAt, type WebLobbyState } from "@/lib/lobby/client";
import { FLOAT_MS, tally, type Float } from "@/lib/lobby/signals";
import { tvChoice } from "@/lib/lobby/tv";
import type { RoomSignals } from "./useRoomSignals";
import tv from "./tv.module.css";

export function TvFloats({ floats }: { floats: Float[] }) {
  const now = Date.now();
  const live = floats.filter((f) => now - f.at < FLOAT_MS);
  if (!live.length) return null;
  return (
    <div className={tv.floats} aria-hidden="true" data-testid="tv-reactions">
      {live.map((f) => (
        <span key={f.id} className={tv.float} style={{ "--x": `${f.x}%` } as CSSProperties}>{f.emoji}</span>
      ))}
    </div>
  );
}

export function TvAudience({ lobby, now, votes }: { lobby: WebLobbyState; now: number; votes: RoomSignals["votes"] }) {
  const phase = phaseAt(lobby, now);
  if (phase.kind !== "round" && phase.kind !== "reveal") return null;
  const round = votes.get(phase.index);
  if (!round?.size) return null;
  const top = tally(round)[0];
  return (
    <p className={tv.audience} data-testid="tv-audience">
      Audience ({round.size}): {phase.kind === "reveal" ? `picked ${tvChoice(top.choice)}` : "voting"}
    </p>
  );
}

"use client";

import type { CSSProperties } from "react";
import { bonusQuestion } from "@academy/lobbies";
import { phaseAt, type WebLobbyState } from "@/lib/lobby/client";
import { audienceTally, FLOAT_MS, type Float } from "@/lib/lobby/signals";
import { tvChoice } from "@/lib/lobby/tv";
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

export function TvAudience({ lobby, now }: { lobby: WebLobbyState; now: number }) {
  const phase = phaseAt(lobby, now);
  if (phase.kind !== "round" && phase.kind !== "reveal") return null;
  if (!bonusQuestion(lobby, phase.index)) return null;
  const round = audienceTally(lobby.bonusVotes, phase.index);
  if (!round) return null;
  const top = round.choices[0];
  return (
    <p className={tv.audience} data-testid="tv-audience">
      Bonus question, audience ({round.total}): {phase.kind === "reveal" ? `picked ${tvChoice(top.choice)}` : "voting"}
    </p>
  );
}

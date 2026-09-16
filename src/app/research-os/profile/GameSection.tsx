"use client";

import { useEffect, useState } from "react";

// The game layer on the profile (ros-33): XP and level, streak, badges.
// Reads the `game` block GET /api/research-os/profile returns.

interface Game {
  xp: number;
  level: number;
  into: number;
  span: number;
  streakDays: number;
  lastActiveDay: string | null;
  badges: { kind: "internalized" | "produced"; node_id: string; at: string }[];
}

export default function GameSection({ token }: { token: string | null }) {
  const [game, setGame] = useState<Game | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/research-os/profile", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        if (!res.ok) return;
        const j = (await res.json()) as { game?: Game };
        if (!cancelled && j.game) setGame(j.game);
      } catch {
        /* profile unavailable */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token || !game) return null;
  const pct = game.span > 0 ? Math.round((100 * game.into) / game.span) : 0;
  const internalized = game.badges.filter((b) => b.kind === "internalized").length;
  const produced = game.badges.filter((b) => b.kind === "produced").length;

  return (
    <section className="mt-10">
      <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-3">§ progress</div>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <div>
          <span className="font-display text-[28px] text-[color:var(--basalt)]">level {game.level}</span>
          <span className="ml-2 text-[13px] text-[color:var(--basalt-3)]" style={{ fontFamily: "var(--font-jetbrains)" }}>
            {game.xp} xp
          </span>
        </div>
        <div className="text-[13px] text-[color:var(--basalt-2)]">
          streak <b>{game.streakDays}</b> day{game.streakDays === 1 ? "" : "s"}
        </div>
        <div className="text-[13px] text-[color:var(--basalt-2)]">
          badges <b>{internalized}</b> internalized · <b>{produced}</b> produced
        </div>
      </div>
      <div className="mt-3 h-1.5 w-full max-w-md bg-[color:var(--hairline)] rounded overflow-hidden" aria-label={`${pct}% to the next level`}>
        <div className="h-full bg-[color:var(--gold)]" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-[12px] text-[color:var(--basalt-3)]">
        {game.span - game.into} xp to level {game.level + 1}. XP comes from each node's first rise to a new level: awareness 10, understanding 25,
        internalization 50, production 100.
      </p>
    </section>
  );
}

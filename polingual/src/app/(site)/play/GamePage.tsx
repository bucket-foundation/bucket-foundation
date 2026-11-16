"use client";

import type { ReactNode } from "react";
import type { DailyGame } from "@/lib/daily/store";
import type { WorldId } from "@/ui/art/play";
import app from "../app/app.module.css";
import { DailyWorld, Loading, Results } from "./daily/DailyWorld";
import type { useDaily } from "./daily/useDaily";
import GameWorld from "./GameWorld";

export type GameStatus = { error: string } | { loading: string } | null;

type ShellProps = { id: WorldId; caption?: ReactNode; title?: ReactNode; active?: boolean; aside?: ReactNode; status?: GameStatus; children?: () => ReactNode };

export function StatusLine({ status }: { status: Exclude<GameStatus, null> }) {
  return "error" in status ? <p className={app.error} role="alert">{status.error}</p> : <p className={app.muted} aria-busy="true">{status.loading}</p>;
}

export default function GamePage({ id, caption, title, active, aside, status = null, children }: ShellProps) {
  if (status) return <GameWorld id={id} caption={caption} title={title} active={active} aside={aside}><StatusLine status={status} /></GameWorld>;
  return <GameWorld id={id} caption={caption} title={title} active={active} aside={aside}>{children?.()}</GameWorld>;
}

type Daily = ReturnType<typeof useDaily>;
type Ready = Extract<Daily["state"], { status: "ready" }>;

export function DailyPage({ id, title, daily, playable, children }: { id: DailyGame; title: string; daily: Daily; playable: boolean; children: (state: Ready) => ReactNode }) {
  const { state, retry } = daily;
  if (state.status !== "ready") return <DailyWorld id={id}><Loading state={state.status} /></DailyWorld>;
  if (state.done) return <DailyWorld id={id}><Results title={title} result={state.done} url={`https://polingual.com/play/${id}`} saved={state.saved} onRetry={retry} rootLang={state.system.root} /></DailyWorld>;
  if (!playable) return <DailyWorld id={id}><Loading state="error" /></DailyWorld>;
  return <DailyWorld id={id}>{children(state)}</DailyWorld>;
}

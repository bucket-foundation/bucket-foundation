"use client";

import type { ReactNode } from "react";
import type { LobbyApi, WebLobbyState } from "@/lib/lobby/client";
import { tvShortUrl } from "@/lib/lobby/tv";
import { readyLine, setupGames, waitingRows } from "@/lib/lobby/waiting";
import { Avatar } from "@/ui/avatar";
import Qr from "../../live/Qr";
import { gameName, langName } from "../langs";
import { FlagSquare } from "../LearnWord";
import { HostSettings } from "./HostSettings";
import wait from "./waiting.module.css";

type Host = { api: LobbyApi; take: (l: WebLobbyState, sentAt: number) => void };

function setupLabel(lobby: WebLobbyState): string {
  if (lobby.setup === "mix") return "Random mix";
  if (lobby.setup === "sequence") return "Game set, in order";
  return "One game";
}

export function WaitingBoard({ lobby, joinUrl, tv = false, showJoin = true, host, actions, children }: { lobby: WebLobbyState; joinUrl: string | null; tv?: boolean; showJoin?: boolean; host?: Host; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className={wait.board} data-tv={tv} data-join={showJoin} data-testid="waiting-board">
      {actions ? <div className={wait.actions}>{actions}</div> : null}
      {showJoin ? <JoinCard code={lobby.code} joinUrl={joinUrl} /> : null}
      <section className={wait.info} aria-label="Lobby">
        <GamesCard lobby={lobby} tv={tv} host={host} />
        <PlayersCard lobby={lobby} tv={tv} />
        {children}
      </section>
    </div>
  );
}

function JoinCard({ code, joinUrl }: { code: string; joinUrl: string | null }) {
  return (
    <section className={wait.join} aria-label="Join">
      <p className={wait.label}>Join with this code</p>
      <p className={wait.code} data-testid="room-code">{code}</p>
      {joinUrl ? (
        <>
          <div className={wait.qr}>
            <Qr text={joinUrl} />
          </div>
          <p className={wait.url} data-testid="join-url">{tvShortUrl(joinUrl)}</p>
        </>
      ) : null}
    </section>
  );
}

function GamesCard({ lobby, tv, host }: { lobby: WebLobbyState; tv: boolean; host?: Host }) {
  return (
    <div className={wait.card}>
      <p className={wait.label}>{setupLabel(lobby)}</p>
      <ol className={wait.games} data-testid="setup-line">
        {setupGames(lobby).map((g, i) => (
          <li key={g} data-now={lobby.setup !== "mix" && g === lobby.game}>
            {lobby.setup === "sequence" ? <span className={wait.order}>{i + 1}</span> : null}
            {gameName(g)}
          </li>
        ))}
      </ol>
      <p className={wait.langs} data-testid="room-langs">
        {lobby.targets.map((l) => (
          <span key={l} className={wait.lang}>
            <FlagSquare lang={l} size={tv ? 28 : 18} />
            {langName(l)}
          </span>
        ))}
      </p>
      {host ? <HostSettings lobby={lobby} api={host.api} take={host.take} /> : null}
    </div>
  );
}

function PlayersCard({ lobby, tv }: { lobby: WebLobbyState; tv: boolean }) {
  const rows = waitingRows(lobby);
  return (
    <div className={wait.card}>
      <div className={wait.head}>
        <p className={wait.label}>Players</p>
        <p className={wait.count} data-testid="ready-count">{readyLine(lobby)}</p>
      </div>
      {rows.length ? (
        <ul className={wait.players} data-testid="players">
          {rows.map((p) => (
            <li key={p.id} data-me={p.me} data-ready={p.ready}>
              <Avatar seed={p.name} size={tv ? "sm" : "xs"} variant="head" label="" />
              <span className={wait.name}>
                {p.name}
                {p.host ? <span className={wait.tag}>host</span> : null}
                {p.bot ? <span className={wait.tag}>bot</span> : null}
              </span>
              <span className={wait.state}>{p.ready ? "Ready" : "Waiting"}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={wait.empty}>Scan the code to join.</p>
      )}
    </div>
  );
}

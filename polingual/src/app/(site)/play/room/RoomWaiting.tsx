"use client";

import { secondsUntil, waitingHint } from "@/lib/lobby/room";
import { Button } from "@/ui";
import app from "../../app/app.module.css";
import { gameName } from "../langs";
import styles from "../play.module.css";
import { RoomChat, RoomHeader } from "../RoomParts";
import { RoomToolbar, Scoreboard } from "./RoomBits";
import type { LiveRoom } from "./useRoomGame";

export function RoomWaiting({ g }: { g: LiveRoom }) {
  const { lobby, api, act } = g;
  const me = lobby.players.find((p) => p.isMe);
  const readyCount = lobby.players.filter((p) => p.ready).length;
  return (
    <div className={app.stack} data-testid="room">
      <RoomHeader lobby={lobby} />
      <RoomToolbar g={g} />
      <div className={app.row}>
        <Button variant="ghost" size="md" onClick={() => void g.share()}>{g.copied ? "Link copied" : "Share link"}</Button>
        <Button variant="quiet" size="sm" onClick={() => void g.leave()}>Leave</Button>
        {g.state.status === "ready" && g.state.identity.kind === "guest" ? <Button variant="quiet" size="sm" onClick={g.account.openSignIn} data-testid="room-sign-in">Sign in</Button> : null}
      </div>
      <div className={styles.split}>
        <section className={app.stackSm}>
          <Scoreboard lobby={lobby} />
          <div className={app.row}>
            <Button variant={me?.ready ? "ghost" : "primary"} size={me?.ready ? "md" : "lg"} onClick={() => void act(() => api.ready(lobby.id, !me?.ready))} data-testid="ready">
              {me?.ready ? "Not ready" : "Ready"}
            </Button>
            {lobby.isHost && lobby.botsEnabled && !lobby.botFill ? (
              <Button variant="ghost" size="md" onClick={() => void act(() => api.fillBots(lobby.id))} data-testid="fill-bots">
                Fill with bots
              </Button>
            ) : null}
            {lobby.isHost ? (
              <Button disabled={readyCount < 2} onClick={() => void act(() => api.start(lobby.id))} data-testid="start">
                Start game
              </Button>
            ) : null}
          </div>
          <StartsIn g={g} readyCount={readyCount} />
          {lobby.setup !== "single" ? <p className={app.small} data-testid="setup-line">{lobby.setup === "mix" ? "Random mix of games" : `Game set: ${lobby.playlist.map(gameName).join(", ")}`}</p> : null}
        </section>
        <RoomChat lobby={lobby} chat={g.chat} setChat={g.setChat} onSend={(body) => void act(() => api.chat(lobby.id, body))} />
      </div>
      {g.error ? <p className={app.error} role="alert">{g.error}</p> : null}
    </div>
  );
}

function StartsIn({ g, readyCount }: { g: LiveRoom; readyCount: number }) {
  const startsIn = secondsUntil(g.lobby.nextStartAt, g.now + g.offset);
  return (
    <div className={styles.startsIn} data-testid="next-start">
      {startsIn !== null ? (
        <>
          <span>Next game: {gameName(g.lobby.game)}</span>
          <b data-testid="next-start-count">{startsIn}s</b>
        </>
      ) : (
        <span>{waitingHint(g.lobby, readyCount)}</span>
      )}
    </div>
  );
}

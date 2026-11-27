"use client";

import { everyoneReady, roomControls, secondsUntil, waitingHint } from "@/lib/lobby/room";
import { Button } from "@/ui";
import app from "../../app/app.module.css";
import { gameName } from "../langs";
import styles from "../play.module.css";
import { RoomChat } from "../RoomParts";
import { useJoinUrl } from "../RoomQr";
import { RoomToolbar } from "./RoomBits";
import { WaitingBoard } from "./WaitingBoard";
import wait from "./waiting.module.css";
import type { LiveRoom } from "./useRoomGame";

export function RoomWaiting({ g }: { g: LiveRoom }) {
  const { lobby, api, act } = g;
  const joinUrl = useJoinUrl(lobby.code);
  return (
    <div className={app.stack} data-testid="room">
      <WaitingBoard lobby={lobby} joinUrl={joinUrl} showJoin={roomControls(lobby).bigScreen} host={{ api, take: g.take }} actions={<RoomActions g={g} />}>
        <RoomLinks g={g} />
        <RoomChat lobby={lobby} api={api} chat={g.chat} setChat={g.setChat} onSend={(body) => void act(() => api.chat(lobby.id, body))} />
      </WaitingBoard>
      {g.error ? <p className={app.error} role="alert">{g.error}</p> : null}
    </div>
  );
}

function RoomActions({ g }: { g: LiveRoom }) {
  const { lobby, api, act } = g;
  const me = lobby.players.find((p) => p.isMe);
  const all = everyoneReady(lobby);
  const can = roomControls(lobby);
  return (
    <section className={wait.actionCard} aria-label="Ready">
      <div className={wait.actionRow}>
        <Button variant={me?.ready ? "ghost" : "primary"} size="lg" onClick={() => void act(() => api.ready(lobby.id, !me?.ready))} data-testid="ready">
          {me?.ready ? "Not ready" : "Ready"}
        </Button>
        {can.start ? (
          <Button size="lg" disabled={!all} onClick={() => void act(() => api.start(lobby.id))} data-testid="start">
            Start game
          </Button>
        ) : null}
      </div>
      <StartsIn g={g} />
      <div className={app.row}>
        {can.fillBots ? (
          <Button variant="ghost" size="md" onClick={() => void act(() => api.fillBots(lobby.id))} data-testid="fill-bots">
            Fill with bots
          </Button>
        ) : null}
        <RoomToolbar g={g} />
      </div>
    </section>
  );
}

function RoomLinks({ g }: { g: LiveRoom }) {
  const { lobby } = g;
  const can = roomControls(lobby);
  return (
    <section className={app.stackSm}>
      <div className={app.row}>
        {can.settings ? <Button variant="ghost" size="md" onClick={() => void g.act(() => g.api.hostMode(lobby.id, true))} data-testid="mode-screen">Host on this screen</Button> : null}
        {!can.invite ? (
          <Button variant="ghost" size="md" onClick={() => void g.share()}>{g.copied ? "Link copied" : "Share link"}</Button>
        ) : (
          <Button variant="quiet" size="sm" onClick={() => void g.share()} data-testid="invite">{g.copied ? "Link copied" : "Invite"}</Button>
        )}
        <Button variant="quiet" size="sm" onClick={() => void g.leave()} data-testid="leave-game">Leave game</Button>
        {g.state.status === "ready" && g.state.identity.kind === "guest" ? <Button variant="quiet" size="sm" onClick={g.account.openSignIn} data-testid="room-sign-in">Sign in</Button> : null}
      </div>
      {can.settings ? <p className={app.small} data-testid="host-screen-hint">Host on this screen turns this device into the room display. You stop playing; phones join with the code.</p> : null}
    </section>
  );
}

function StartsIn({ g }: { g: LiveRoom }) {
  const startsIn = secondsUntil(g.lobby.nextStartAt, g.now + g.offset);
  return (
    <div className={styles.startsIn} data-testid="next-start">
      {startsIn !== null ? (
        <>
          <span>Next game: {gameName(g.lobby.game)}</span>
          <b data-testid="next-start-count">{startsIn}s</b>
        </>
      ) : (
        <span>{waitingHint(g.lobby)}</span>
      )}
    </div>
  );
}

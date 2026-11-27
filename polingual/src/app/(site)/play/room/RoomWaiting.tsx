"use client";

import { secondsUntil, waitingHint } from "@/lib/lobby/room";
import { tvPath } from "@/lib/lobby/tv";
import { Button, ButtonLink } from "@/ui";
import app from "../../app/app.module.css";
import { gameName } from "../langs";
import styles from "../play.module.css";
import { RoomChat } from "../RoomParts";
import { useJoinUrl } from "../RoomQr";
import { RoomToolbar } from "./RoomBits";
import { WaitingBoard } from "./WaitingBoard";
import wait from "./waiting.module.css";
import { usePauseAds } from "../AdsContext";
import { useIsPhone } from "@/lib/hooks/phone";
import type { LiveRoom } from "./useRoomGame";

export function RoomWaiting({ g }: { g: LiveRoom }) {
  const { lobby, api, act } = g;
  const joinUrl = useJoinUrl(lobby.code);
  const phone = useIsPhone();
  usePauseAds(phone);
  return (
    <div className={app.stack} data-testid="room">
      <WaitingBoard lobby={lobby} joinUrl={joinUrl} showJoin={lobby.isHost} host={{ api, take: g.take }} actions={<RoomActions g={g} />}>
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
  const readyCount = lobby.players.filter((p) => p.ready).length;
  return (
    <section className={wait.actionCard} aria-label="Ready">
      <div className={wait.actionRow}>
        <Button variant={me?.ready ? "ghost" : "primary"} size="lg" onClick={() => void act(() => api.ready(lobby.id, !me?.ready))} data-testid="ready">
          {me?.ready ? "Not ready" : "Ready"}
        </Button>
        {lobby.isHost ? (
          <Button size="lg" disabled={readyCount < 2} onClick={() => void act(() => api.start(lobby.id))} data-testid="start">
            Start game
          </Button>
        ) : null}
      </div>
      <StartsIn g={g} readyCount={readyCount} />
      <div className={app.row}>
        {lobby.isHost && lobby.botsEnabled && !lobby.botFill ? (
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
  return (
    <section className={app.stackSm}>
      <div className={app.row}>
        {lobby.isHost ? <ButtonLink variant="ghost" size="md" href={tvPath(lobby.code)} target="_blank" rel="noopener" data-testid="big-screen">Big screen</ButtonLink> : null}
        {lobby.isHost ? (
          <Button variant="ghost" size="md" onClick={() => void g.share()}>{g.copied ? "Link copied" : "Share link"}</Button>
        ) : (
          <Button variant="quiet" size="sm" onClick={() => void g.share()} data-testid="invite">{g.copied ? "Link copied" : "Invite"}</Button>
        )}
        <Button variant="quiet" size="sm" onClick={() => void g.leave()}>Leave</Button>
        {g.state.status === "ready" && g.state.identity.kind === "guest" ? <Button variant="quiet" size="sm" onClick={g.account.openSignIn} data-testid="room-sign-in">Sign in</Button> : null}
      </div>
      {lobby.isHost ? <p className={app.small} data-testid="big-screen-hint">Open this on the TV or a laptop on HDMI. Phones join with the code.</p> : null}
    </section>
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

"use client";

import { useEffect, useState } from "react";
import { emitReward } from "@/lib/reward";
import { LEARN_HREF, myScore, standings } from "@/lib/lobby/client";
import { roomControls, secondsUntil } from "@/lib/lobby/room";
import { markSavePrompt, savePromptDue } from "@/lib/lobby/save-prompt";
import { Button, ButtonLink } from "@/ui";
import app from "../../app/app.module.css";
import Ad from "../Ad";
import Interstitial from "../Interstitial";
import styles from "../play.module.css";
import Reveal from "../Reveal";
import RoomMissed from "../RoomMissed";
import { RoomToolbar, Scoreboard } from "./RoomBits";
import type { LiveRoom } from "./useRoomGame";

export function RoomResults({ g }: { g: LiveRoom }) {
  const { lobby, breaks } = g;
  const board = standings(lobby);
  useEffect(() => emitReward("round-end"), []);
  const guest = g.state.status === "ready" && g.state.identity.kind === "guest";
  return (
    <div className={app.stack} data-testid="results">
      <Interstitial open={g.interstitial} onClose={() => g.setInterstitial(false)} />
      <section className={app.stackSm}>
        <p className={app.label}>Game over</p>
        <h2 className={app.title}>{board[0]?.isMe ? "🏆 You won" : `${board[0]?.name ?? "Nobody"} wins`}</h2>
      </section>
      <Scoreboard lobby={lobby} />
      <NextBar g={g} />
      <SavePrompt g={g} guest={guest} />
      <RoomToolbar g={g} />
      <section className={app.stackSm} data-testid="reveal-all">
        <h2 className={app.fieldLabel}>Every word in this game</h2>
        {lobby.prompts.map((p) => (p.reveal?.length ? <Reveal key={p.round} prompt={p} rootLang={lobby.root} answersOnly /> : null))}
      </section>
      <RoomMissed lobby={lobby} at={g.now + g.offset} />
      {breaks.games >= 2 ? <Ad placement="results" /> : null}
    </div>
  );
}

function NextBar({ g }: { g: LiveRoom }) {
  const { lobby, next, busy, api, act } = g;
  const startsIn = secondsUntil(lobby.nextStartAt, g.now + g.offset);
  const can = roomControls(lobby);
  const auto = lobby.standing || !!lobby.nextStartAt;
  return (
    <section className={styles.nextBar} data-testid="next-ctas">
      {auto ? (
        <span className={styles.nextName} data-testid="next-game">
          Next game starts in <b data-testid="next-start-count">{startsIn ?? 0}s</b>
        </span>
      ) : next ? (
        <ButtonLink size="md" href={`/play/${next.code}`} data-testid="next-game">Next game: {next.name}</ButtonLink>
      ) : null}
      {auto && can.nextNow ? (
        <Button size="md" disabled={busy} onClick={() => void act(() => api.next(lobby.id))} data-testid="next-now">Next game now</Button>
      ) : null}
      <Button variant="quiet" size="sm" onClick={() => void g.leave()} data-testid="results-leave">Leave</Button>
      <ButtonLink variant="ghost" size="md" href={LEARN_HREF} data-testid="results-learn">Start learning</ButtonLink>
    </section>
  );
}

function SavePrompt({ g, guest }: { g: LiveRoom; guest: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const store = (() => {
      try {
        return window.localStorage;
      } catch {
        return null;
      }
    })();
    if (!savePromptDue(store, guest)) return;
    setOpen(true);
    markSavePrompt(store);
  }, [guest]);
  if (!open) return null;
  return (
    <section className={styles.upsell} data-testid="save-progress" aria-label="Save your score">
      <b>Save your score: create an account</b>
      <p className={app.small}>You scored {myScore(g.lobby)} points. An account keeps your streak, stats and game history. The next game starts on its own.</p>
      <div className={app.row}>
        <Button onClick={g.account.openSignIn} data-testid="save-sign-in">Create an account</Button>
        <Button variant="quiet" size="sm" onClick={() => setOpen(false)} data-testid="save-dismiss">Not now</Button>
      </div>
    </section>
  );
}

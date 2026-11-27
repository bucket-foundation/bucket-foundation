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
import AfterGame from "../family/AfterGame";
import { EndGame, RoomToolbar, Scoreboard } from "./RoomBits";
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
      <AfterGame lobby={lobby} token={g.state.status === "ready" ? g.state.identity.token : null} onSignIn={guest ? g.account.openSignIn : undefined} />
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
      {can.end ? <EndGame g={g} /> : null}
      <Button variant="quiet" size="sm" onClick={() => void g.leave()} data-testid="results-leave">Leave</Button>
      <ButtonLink variant="ghost" size="md" href={LEARN_HREF} data-testid="results-learn">Start learning</ButtonLink>
    </section>
  );
}

function SavePrompt({ g, guest, always = false }: { g: LiveRoom; guest: boolean; always?: boolean }) {
  const [open, setOpen] = useState(always && guest);
  useEffect(() => {
    if (always) return;
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
  }, [guest, always]);
  if (!open) return null;
  return (
    <section className={styles.upsell} data-testid="save-progress" aria-label="Save your score">
      <b>Save your score: create an account</b>
      <p className={app.small}>{always ? `You scored ${g.lobby.players.find((p) => p.isMe)?.total ?? myScore(g.lobby)} points tonight.` : `You scored ${myScore(g.lobby)} points.`} An account keeps your streak, stats and game history.{always ? "" : " The next game starts on its own."}</p>
      <div className={app.row}>
        <Button onClick={g.account.openSignIn} data-testid="save-sign-in">Create an account</Button>
        <Button variant="quiet" size="sm" onClick={() => setOpen(false)} data-testid="save-dismiss">Not now</Button>
      </div>
    </section>
  );
}

export function RoomFinal({ g }: { g: LiveRoom }) {
  const { lobby, busy } = g;
  const board = [...lobby.players].sort((a, b) => (b.total ?? b.score) - (a.total ?? a.score) || a.name.localeCompare(b.name));
  const guest = g.state.status === "ready" && g.state.identity.kind === "guest";
  const top = board[0];
  return (
    <div className={app.stack} data-testid="final">
      <section className={app.stackSm}>
        <p className={app.label}>Final scores</p>
        <h2 className={app.title}>{top?.isMe ? "🏆 You won the night" : `${top?.name ?? "Nobody"} wins`}</h2>
      </section>
      <ol className={styles.players} data-testid="final-scores">
        {board.map((p, i) => (
          <li key={p.userId} className={styles.player} data-me={p.isMe}>
            <span className={styles.playerName}>#{i + 1} {p.name}</span>
            <span className={styles.score} data-testid="final-total">{p.total ?? p.score}</span>
          </li>
        ))}
      </ol>
      <SavePrompt g={g} guest={guest} always />
      <section className={styles.nextBar}>
        <Button size="md" disabled={busy} onClick={() => void g.newLobby(false)} data-testid="play-again">Play again</Button>
        <Button variant="ghost" size="md" onClick={() => void g.leave()} data-testid="final-leave">Leave</Button>
      </section>
    </div>
  );
}

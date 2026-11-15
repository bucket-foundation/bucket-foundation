"use client";

import { LEARN_HREF, myScore, standings } from "@/lib/lobby/client";
import { secondsUntil } from "@/lib/lobby/room";
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
  const guest = g.state.status === "ready" && g.state.identity.kind === "guest";
  return (
    <div className={app.stack} data-testid="results">
      <Interstitial open={g.interstitial} onClose={() => g.setInterstitial(false)} />
      <section className={app.stackSm}>
        <p className={app.label}>Game over</p>
        <h2 className={app.title}>{board[0]?.isMe ? "🏆 You won" : `${board[0]?.name ?? "Nobody"} wins`}</h2>
      </section>
      <RoomToolbar g={g} />
      <Scoreboard lobby={lobby} />
      <NextBar g={g} />
      <section className={app.stackSm} data-testid="reveal-all">
        <h2 className={app.fieldLabel}>Every word in this game</h2>
        {lobby.prompts.map((p) => (p.reveal?.length ? <Reveal key={p.round} prompt={p} rootLang={lobby.root} answersOnly /> : null))}
      </section>
      {guest ? (
        <section className={styles.upsell} data-testid="save-progress">
          <b>Save your progress</b>
          <p className={app.small}>You scored {myScore(lobby)} points. Sign in to keep your streak, stats and game history. Your guest games come with you.</p>
          <Button onClick={g.account.openSignIn} data-testid="save-sign-in">Sign in to save</Button>
        </section>
      ) : null}
      <RoomMissed lobby={lobby} at={g.now + g.offset} />
      {breaks.games >= 2 ? <Ad placement="results" /> : null}
      <div className={app.row}>
        <ButtonLink variant="ghost" size="md" href="/play">Back to lobbies</ButtonLink>
      </div>
    </div>
  );
}

function NextBar({ g }: { g: LiveRoom }) {
  const { lobby, next, busy } = g;
  const startsIn = secondsUntil(lobby.nextStartAt, g.now + g.offset);
  return (
    <section className={styles.nextBar} data-testid="next-ctas">
      {lobby.standing || lobby.nextStartAt ? (
        <span className={styles.nextName} data-testid="next-game">Next game{(lobby.setup ?? "single") === "single" ? `: ${lobby.name}` : ""}{startsIn !== null ? ` in ${startsIn}s` : " in a few seconds"}</span>
      ) : next ? (
        <ButtonLink size="md" href={`/play/${next.code}`} data-testid="next-game">Next game: {next.name}</ButtonLink>
      ) : null}
      <Button variant="ghost" size="md" disabled={busy} onClick={() => void g.newLobby(false)} data-testid="rematch">Rematch</Button>
      <Button variant="ghost" size="md" disabled={busy} onClick={() => void g.newLobby(true)} data-testid="play-bots">Play with bots</Button>
      <ButtonLink size="md" href={LEARN_HREF} data-testid="results-learn">Start learning</ButtonLink>
    </section>
  );
}

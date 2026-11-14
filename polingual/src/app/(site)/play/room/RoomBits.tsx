"use client";

import { botLabel, flagEmoji, gameProgress, livesLeft, myScore, ranked, standings, streakOf, type Phase } from "@/lib/lobby/client";
import { livesText } from "@/lib/lobby/room";
import { Avatar } from "@/ui/avatar";
import { Pill } from "@/ui";
import LiveBoard from "../LiveBoard";
import { CoinArt } from "../Pieces";
import styles from "../play.module.css";
import type { LiveRoom } from "./useRoomGame";

export function RoomToolbar({ g }: { g: LiveRoom }) {
  const streak = streakOf(g.lobby);
  return (
    <div className={styles.toolbar}>
      <span className={styles.flames} data-testid="streak" data-on={streak >= 2}>
        {streak >= 2 ? `🔥 ${streak} in a row` : ""}
      </span>
      <Pill size="sm" onClick={g.toggleMute} aria-pressed={g.muted} data-testid="mute">
        {g.muted ? "🔇 Sound off" : "🔊 Sound on"}
      </Pill>
    </div>
  );
}

export function Scoreboard({ lobby }: { lobby: LiveRoom["lobby"] }) {
  return (
    <ol className={styles.players} data-testid="players">
      {standings(lobby).map((p) => (
        <li key={p.userId} className={styles.player} data-me={p.isMe}>
          <span className={styles.playerName}>
            <Avatar seed={p.name} size="xs" variant="head" label="" />
            {p.flag ? <span aria-hidden="true">{flagEmoji(p.flag)} </span> : null}
            {p.name}
            {p.bot ? <span className={styles.tag} data-testid="bot-tag"> {botLabel(p)}</span> : null}
            {p.handle ? <span className={styles.handle} data-testid="player-handle"> @{p.handle}</span> : null}
            {p.isHost ? <span className={styles.tag}> host</span> : null}
            {!p.online ? <span className={styles.tag}> away</span> : null}
          </span>
          <span className={styles.score}>{lobby.status === "lobby" ? (p.ready ? "ready" : "waiting") : p.score}</span>
        </li>
      ))}
    </ol>
  );
}

export function roundLives(lobby: LiveRoom["lobby"], phase: Phase): number | null {
  if (lobby.game !== "tiles" || (phase.kind !== "round" && phase.kind !== "reveal")) return null;
  return livesLeft(lobby, phase.kind === "round" ? phase.index : phase.index + 1);
}

export function RoomHud({ g, phase }: { g: LiveRoom; phase: Phase }) {
  const { lobby } = g;
  const lives = roundLives(lobby, phase);
  const streak = streakOf(lobby);
  const rank = ranked(lobby.players).find((p) => p.isMe)?.rank ?? null;
  const progress = gameProgress(phase, lobby.rounds);
  return (
    <div className={styles.hud} data-testid="hud">
      <div className={styles.hudRow}>
        <span className={styles.hudRound} data-testid="round-count">
          {phase.kind === "round" || phase.kind === "reveal" ? `Round ${phase.index + 1} of ${lobby.rounds}` : `${lobby.rounds} rounds`}
        </span>
        <span className={styles.hudScore}>
          <span className={styles.scoreNow} key={myScore(lobby)} data-testid="my-score">{myScore(lobby)}</span> pts
        </span>
        {rank ? <span className={styles.hudRank} data-testid="my-rank">#{rank} of {lobby.players.length}</span> : null}
        <span className={styles.flames} data-testid="streak" data-on={streak >= 2}>{streak >= 2 ? `🔥 ${streak}` : ""}</span>
        {lobby.game === "duel" ? <span className={styles.coins} data-testid="coins" aria-label={`${lobby.coins} coins`}><CoinArt size={26} /> {lobby.coins}</span> : null}
        {lives !== null ? <span className={styles.lives} data-testid="lives" aria-label={`${lives} lives left`}>{livesText(lives)}</span> : null}
        <Pill size="sm" onClick={g.toggleMute} aria-pressed={g.muted} aria-label={g.muted ? "Sound off" : "Sound on"} data-testid="mute">
          {g.muted ? "🔇" : "🔊"}
        </Pill>
      </div>
      <div className={styles.gameBar} role="progressbar" aria-label="Game progress" aria-valuemin={0} aria-valuemax={lobby.rounds} aria-valuenow={Math.round(progress * lobby.rounds)} data-testid="game-progress">
        <div style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}

export function RoomSide({ g, phase }: { g: LiveRoom; phase: Phase }) {
  return (
    <aside className={styles.side}>
      <LiveBoard players={g.lobby.players} live={phase.kind === "round"} />
    </aside>
  );
}

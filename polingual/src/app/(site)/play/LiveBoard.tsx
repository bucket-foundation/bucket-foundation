"use client";

import { botLabel, flagEmoji, ranked, type WebLobbyState } from "@/lib/lobby/client";
import styles from "./play.module.css";
import { Avatar } from "@/ui/avatar";
import { Card } from "@/ui";

const ROW = 40;

export default function LiveBoard({ players, live }: { players: WebLobbyState["players"]; live: boolean }) {
  const rows = ranked(players);
  const order = [...rows].sort((a, b) => a.userId.localeCompare(b.userId));
  const at = new Map(rows.map((p, i) => [p.userId, i]));
  return (
    <ol className={styles.board} style={{ height: rows.length * ROW }} data-testid="live-board" aria-label="Scoreboard">
      {order.map((p) => (
        <Card as="li" pad="none" key={p.userId} className={styles.boardRow} data-me={p.isMe} data-answered={live && p.answered} style={{ transform: `translateY(${(at.get(p.userId) ?? 0) * ROW}px)` }} data-testid="board-row">
          <span className={styles.boardRank}>{p.rank}</span>
          <span className={styles.boardName}>
            <Avatar seed={p.name} size="chip" variant="head" label="" />
            {p.flag ? <span aria-hidden="true">{flagEmoji(p.flag)} </span> : null}
            {p.isMe ? "You" : p.name}
            {p.bot ? <span className={styles.tag} data-testid="bot-tag"> {botLabel(p)}</span> : null}
            {p.handle ? <span className={styles.handle} data-testid="player-handle"> @{p.handle}</span> : null}
          </span>
          {live && p.answered ? <span className={styles.boardTick} aria-label="answered">✓</span> : null}
          <span className={styles.boardScore} key={p.score} data-testid="board-score">{p.score}</span>
        </Card>
      ))}
    </ol>
  );
}

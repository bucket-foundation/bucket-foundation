"use client";

import dynamic from "next/dynamic";
import { displayNickname, joinUrl, secondsLeft, team, TEAMS, type Snapshot } from "@/lib/stoa/client";
import { answeredShare, boardStates, nextTeamSlot, type HostRoom } from "@/lib/stoa/host";
import { roundSeconds } from "@/lib/stoa/phone";
import { Avatar } from "@/ui/avatar";
import { Button, cssVars } from "@/ui";
import { Prompt, Standings, TeamStandings, TeamTag, Tiles } from "../parts";
import { Confetti, Drift, Podium, TimerRing } from "../show";
import styles from "../stoa.module.css";
import type { HostRoomState } from "./useHostRoom";

const Qr = dynamic(() => import("../Qr"), { ssr: false });
const APP_URL = "https://apps.apple.com/app/id6825177856";
const APP_HOST = APP_URL.replace("https://", "");

type BoardProps = { h: HostRoomState; room: HostRoom; snap: Snapshot; now: number; origin: string; moves: Record<string, number> };

export function HostBoard(p: BoardProps) {
  const { snap } = p;
  const phase = snap.room.phase;
  const q = snap.question;
  const controls = <HostControls h={p.h} snap={snap} />;
  if (phase === "lobby") return <BoardLobby {...p} controls={controls} />;
  if ((phase === "question" || phase === "reveal") && q) return <BoardQuestion snap={snap} q={q} now={p.now} offset={p.h.offset.current} controls={controls} />;
  if (phase === "board") return <BoardStandings snap={snap} moves={p.moves} controls={controls} />;
  return <BoardFinale snap={snap} controls={controls} />;
}

function BoardStandings({ snap, moves, controls }: { snap: Snapshot; moves: Record<string, number>; controls: React.ReactNode }) {
  return (
    <section className={styles.board} data-testid="board-standings">
      <h2 className={styles.title}>Round {snap.question?.round ?? ""} standings</h2>
      {snap.team_standings ? <TeamStandings rows={snap.team_standings} /> : null}
      <Standings rows={snap.team_standings ? snap.standings.slice(0, 5) : snap.standings} moves={moves} />
      {controls}
    </section>
  );
}

function BoardFinale({ snap, controls }: { snap: Snapshot; controls: React.ReactNode }) {
  return (
    <section className={styles.board} data-testid="board-finale">
      <Confetti />
      <h2 className={styles.title}>Final board</h2>
      {snap.team_standings ? <TeamStandings rows={snap.team_standings} /> : <Podium rows={snap.standings.slice(0, 3)} />}
      <Standings rows={snap.standings.slice(0, 5)} testId="finale-top" />
      {!snap.room.school_mode ? (
        <p className={styles.body} data-testid="board-promo">Keep learning at home with the Polingual app: {APP_HOST}</p>
      ) : null}
      {controls}
    </section>
  );
}

function HostControls({ h, snap }: { h: HostRoomState; snap: Snapshot }) {
  const phase = snap.room.phase;
  const act = h.act;
  return (
    <div className={styles.controls} data-testid="host-controls">
      {phase === "lobby" ? (
        <>
          <Button onClick={() => void act("start")} disabled={snap.room.players === 0} data-testid="start">Start</Button>
          <Button variant="ghost" size="md" aria-pressed={snap.room.locked} onClick={() => void act(snap.room.locked ? "unlock" : "lock")} data-testid="lock">
            {snap.room.locked ? "Room locked" : "Lock room"}
          </Button>
        </>
      ) : null}
      {phase === "question" || phase === "reveal" || phase === "board" ? (
        <>
          <Button variant="ghost" size="md" onClick={() => void act(snap.room.paused ? "resume" : "pause")} data-testid="pause">{snap.room.paused ? "Resume" : "Pause"}</Button>
          <Button variant="ghost" size="md" onClick={() => void act("skip")} data-testid="skip">Next</Button>
        </>
      ) : null}
      {phase !== "closed" ? <Button variant="ghost" size="md" onClick={() => void act("end")} data-testid="end">End room</Button> : null}
      {phase === "closed" || phase === "finale" ? (
        <>
          <Button variant="ghost" size="md" onClick={() => void h.download()} data-testid="download">Download results</Button>
          <Button variant="ghost" size="md" onClick={h.newRoom} data-testid="new-room">New room</Button>
        </>
      ) : null}
    </div>
  );
}

type Rostered = NonNullable<Snapshot["roster"]>[number];

function PlayerChip({ p, teams, act }: { p: Rostered; teams: number; act: HostRoomState["act"] }) {
  const name = displayNickname(p.nickname);
  return (
    <li className={styles.player}>
      <Avatar seed={p.nickname} size="xs" variant="head" label="" />
      {name}
      {teams ? (
        <Button variant="quiet" size="md" iconOnly aria-label={`Move ${name} to Team ${team(nextTeamSlot(p.team_slot, teams))?.name}`} onClick={() => void act("move", p.id, { team: nextTeamSlot(p.team_slot, teams) })} data-testid="move">⇄</Button>
      ) : null}
      <Button variant="quiet" size="md" iconOnly aria-label={`Remove ${name}`} onClick={() => void act("remove", p.id)}>×</Button>
    </li>
  );
}

function BoardLobby({ h, room, snap, origin, controls }: BoardProps & { controls: React.ReactNode }) {
  const teams = snap.room.mode === "chorus" ? snap.room.teams ?? 2 : 0;
  const roster = snap.roster ?? [];
  const chip = (p: Rostered) => <PlayerChip key={p.id} p={p} teams={teams} act={h.act} />;
  return (
    <section className={styles.board} data-testid="board-lobby">
      <Drift />
      <div className={styles.lobby}>
        <div className={styles.board}>
          <p className={styles.label}>Join at {origin.replace(/^https?:\/\//, "")}/join</p>
          <p className={styles.code} data-testid="room-code">{room.code}</p>
          <p className={styles.stat} data-testid="player-count">{snap.room.players} {snap.room.players === 1 ? "player" : "players"}</p>
          {teams ? (
            <div className={styles.teams} data-testid="team-lobby">
              {TEAMS.slice(0, teams).map((t) => (
                <div key={t.slot} className={styles.teamCol}>
                  <TeamTag slot={t.slot} />
                  <ul className={styles.roster} data-testid={`roster-${t.slot}`}>{roster.filter((p) => (p.team_slot ?? 0) === t.slot).map(chip)}</ul>
                </div>
              ))}
            </div>
          ) : (
            <ul className={styles.roster} data-testid="roster">{roster.map(chip)}</ul>
          )}
        </div>
        <Qr text={joinUrl(origin, room.code)} />
      </div>
      {controls}
    </section>
  );
}

function BoardQuestion({ snap, q, now, offset, controls }: { snap: Snapshot; q: NonNullable<Snapshot["question"]>; now: number; offset: number; controls: React.ReactNode }) {
  const phase = snap.room.phase;
  const reveal = phase === "reveal";
  const left = secondsLeft(snap.room.closes_at, now, offset, snap.room.opens_at);
  return (
    <section className={styles.board} data-testid={`board-${phase}`}>
      <div className={styles.spread}>
        <span className={styles.stat}>Round {q.round} · Question {q.idx + 1} of {snap.room.total}</span>
        <span className={styles.stat} data-testid="answered">{snap.answered ?? 0} of {snap.room.players} answered</span>
        {reveal ? null : <TimerRing left={left} total={roundSeconds(snap.room)} paused={snap.room.paused} />}
      </div>
      {!reveal ? <div className={styles.answeredBar} aria-hidden="true"><span style={cssVars({ "--share": `${answeredShare(snap.answered, snap.room.players)}%` })} /></div> : null}
      <Prompt q={q} />
      <Tiles q={q} grid states={boardStates(reveal, q.answer)} counts={reveal ? q.counts : null} />
      {controls}
    </section>
  );
}

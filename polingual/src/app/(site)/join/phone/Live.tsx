"use client";

import { MARKS, rank, secondsLeft, displayNickname, type Snapshot } from "@/lib/stoa/client";
import { announce, questionStates, resultText, revealStates, roundSeconds } from "@/lib/stoa/phone";
import { buzz } from "@/lib/stoa/stage";
import { Avatar } from "@/ui/avatar";
import { Button, ButtonLink, Card } from "@/ui";
import { Glyph, Prompt, Standings, TeamStandings, TeamTag, Tiles } from "../../live/parts";
import { Confetti, TimerRing } from "../../live/show";
import styles from "../../live/stoa.module.css";

const APP_URL = "https://apps.apple.com/app/id6825177856";

type Question = NonNullable<Snapshot["question"]>;

export function PhoneLive({ snap, now, offset, onNote, onAnswer }: { snap: Snapshot; now: number; offset: number; onNote: (i: number) => void; onAnswer: (i: number) => void }) {
  const q = snap.question;
  const phase = snap.room.phase;
  if (phase === "lobby") return <PhoneLobby snap={snap} onNote={onNote} />;
  if (phase === "question" && q) return <PhoneQuestion snap={snap} q={q} now={now} offset={offset} onAnswer={onAnswer} />;
  if ((phase === "reveal" || phase === "board") && q) return <PhoneReveal snap={snap} q={q} />;
  if (phase === "finale" || phase === "closed") return <PhoneFinale snap={snap} />;
  return <p className={styles.muted}>Waiting for the board.</p>;
}

function PhoneLobby({ snap, onNote }: { snap: Snapshot; onNote: (i: number) => void }) {
  const me = snap.player;
  return (
    <Card as="section" className={styles.card} data-testid="phone-lobby">
      <p className={styles.label}>You are in</p>
      {me ? <Avatar seed={me.nickname} size="xl" bounce label="" /> : null}
      <p className={styles.big}>{me ? displayNickname(me.nickname) : ""}</p>
      <TeamTag slot={me?.team_slot} />
      <p className={styles.body}>Watch the board. The first question opens when the host starts.</p>
      <p className={styles.fieldLabel}>Warm up your fingers</p>
      <div className={styles.warm} data-testid="warm-up">
        {MARKS.map((m, i) => (
          <Button bare key={m.letter} data-pigment={m.pigment} aria-label={`Practice tile ${m.letter}`} onClick={() => { onNote(i); buzz(15); }}>
            <Glyph glyph={m.glyph} />
          </Button>
        ))}
      </div>
    </Card>
  );
}

function PhoneQuestion({ snap, q, now, offset, onAnswer }: { snap: Snapshot; q: Question; now: number; offset: number; onAnswer: (i: number) => void }) {
  const chosen = snap.player?.choice ?? null;
  const left = snap.room.paused ? null : secondsLeft(snap.room.closes_at, now, offset, snap.room.opens_at);
  return (
    <>
      <div className={styles.spread}>
        <span className={styles.stat}>Question {q.idx + 1} of {snap.room.total}</span>
        <TimerRing left={left ?? 0} total={roundSeconds(snap.room)} paused={snap.room.paused} />
      </div>
      <p className={styles.sr} aria-live="polite" data-testid="timer-announce">{announce(left, snap.room.paused)}</p>
      <Prompt q={q} />
      <Tiles q={q} states={questionStates(chosen)} onPick={onAnswer} disabled={chosen !== null || snap.room.paused || left === 0} />
      {chosen !== null ? <p className={styles.banner} data-testid="locked">Locked in. Watch the board.</p> : null}
    </>
  );
}

function PhoneReveal({ snap, q }: { snap: Snapshot; q: Question }) {
  const me = snap.player;
  const phase = snap.room.phase;
  const right = me?.choice != null && me.choice === q.answer;
  const streak = me?.streak ?? 0;
  return (
    <>
      {phase === "reveal" && right ? <Confetti burst={70} /> : null}
      <p className={styles.banner} data-tone={right ? "right" : "wrong"} data-testid="result">
        {resultText(me?.choice, right, me?.points ?? 0, rank(snap.standings, me?.id))}
      </p>
      {right && streak >= 2 ? <p className={styles.streak} data-testid="streak">{streak} in a row</p> : null}
      {phase === "board" && snap.team_standings ? <TeamStandings rows={snap.team_standings} mine={me?.team_slot} /> : null}
      {phase === "board" ? <Standings rows={snap.team_standings ? snap.standings.slice(0, 5) : snap.standings} me={me?.id} /> : <Tiles q={q} states={revealStates(q.answer)} />}
    </>
  );
}

function PhoneFinale({ snap }: { snap: Snapshot }) {
  const me = snap.player;
  return (
    <Card as="section" className={styles.card} data-testid="phone-finale">
      {(rank(snap.standings, me?.id) ?? 99) <= 3 ? <Confetti /> : null}
      <p className={styles.label}>Final board</p>
      <p className={styles.big}>{me?.points ?? 0} points</p>
      {snap.team_standings ? <TeamStandings rows={snap.team_standings} mine={me?.team_slot} /> : null}
      <Standings rows={snap.standings.slice(0, 5)} me={me?.id} />
      {!snap.room.school_mode ? (
        <ButtonLink variant="ghost" size="md" href={APP_URL} data-testid="app-link">Keep learning with Polingual</ButtonLink>
      ) : null}
    </Card>
  );
}

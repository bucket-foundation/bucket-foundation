"use client";

import dynamic from "next/dynamic";
import { tappedChoice } from "@academy/lobby-tiles";
import { answeredRound, promptFor, type Phase } from "@/lib/lobby/client";
import { pickFor, roundFeedback, tilesFeedback, timerWidth } from "@/lib/lobby/room";
import { Button } from "@/ui";
import app from "../../app/app.module.css";
import Ad from "../Ad";
import { WorldStage } from "../GameWorld";
import { TilesHold } from "../LazyHolds";
import styles from "../play.module.css";
import { RoomChoices, type ChoiceProps } from "./RoomChoices";
import { roundLives, RoomHud, RoomSide } from "./RoomBits";
import type { LiveRoom } from "./useRoomGame";

const Tiles = dynamic(() => import("../Tiles"), { loading: () => <TilesHold /> });

type RoundPhase = Extract<Phase, { kind: "round" }>;

export function RoomRound({ g, phase }: { g: LiveRoom; phase: RoundPhase }) {
  const { lobby } = g;
  const prompt = promptFor(lobby, phase.index);
  const mine = pickFor(g.picked, lobby.startedAt, phase.index);
  const done = !!mine || answeredRound(lobby, phase.index);
  const props: ChoiceProps = { g, index: phase.index, mine, done };
  return (
    <div className={app.stack} data-testid="room" data-round="active">
      <RoomHud g={g} phase={phase} />
      {mine && !mine.pending && mine.points > 0 ? <p className={styles.pop} key={`${mine.game}:${mine.round}`} data-testid="score-pop">+{mine.points}</p> : null}
      <WorldStage id={g.worldId}>
      <div className={styles.stage}>
        <div className={styles.arena}>
          <div className={styles.timer} aria-hidden="true">
            <div className={styles.timerFill} style={{ width: timerWidth(phase.remaining, lobby.roundSeconds) }} />
          </div>
          {prompt && prompt.mode === "tiles" ? <TilesRound {...props} phase={phase} gloss={prompt.gloss} choices={prompt.choices} /> : <RoomChoices {...props} prompt={prompt} />}
          {mine && prompt?.mode !== "tiles" ? <p className={styles.feedback} data-testid="feedback" aria-busy={mine.pending}>{roundFeedback(mine)}</p> : null}
        </div>
        <RoomSide g={g} phase={phase} />
      </div>
      </WorldStage>
      {g.error ? <p className={app.error} role="alert">{g.error}</p> : null}
    </div>
  );
}

function TilesRound({ g, index, mine, done, phase, gloss, choices }: ChoiceProps & { phase: RoundPhase; gloss: string; choices: string[] }) {
  const { lobby } = g;
  const lives = roundLives(lobby, phase);
  const elapsed = lobby.roundSeconds * 1000 - phase.remaining * 1000;
  return (
    <>
      <Tiles
        key={`${lobby.startedAt}:${index}`}
        gloss={gloss}
        choices={choices}
        round={index}
        rounds={lobby.rounds}
        roundSeconds={lobby.roundSeconds}
        elapsedMs={elapsed}
        muted={g.muted}
        locked={done || lives === 0}
        onSubmit={(t) => void g.answer(index, tappedChoice(t))}
      />
      {mine ? <p className={styles.feedback} data-testid="feedback" aria-busy={mine.pending}>{tilesFeedback(mine)}</p> : null}
      {lives === 0 ? <OutOfLives g={g} /> : null}
    </>
  );
}

function OutOfLives({ g }: { g: LiveRoom }) {
  const { adsVisible, rewarded, setRewarded, lobby } = g;
  const me = lobby.players.find((p) => p.isMe);
  return (
    <div className={styles.feedback} data-testid="out-of-lives">
      <p>Out of lives.</p>
      {adsVisible && !me?.continues ? (
        rewarded ? (
          <>
            <Ad placement="rewarded" testId="ad-rewarded" />
            <Button onClick={() => { setRewarded(false); void g.act(() => g.api.continueRun(lobby.id)); }} data-testid="continue-claim">Continue with one life</Button>
          </>
        ) : (
          <Button variant="ghost" size="md" onClick={() => setRewarded(true)} data-testid="continue-offer">Watch an ad to continue</Button>
        )
      ) : (
        <p className={app.small}>Watch the rest of this game.</p>
      )}
    </div>
  );
}


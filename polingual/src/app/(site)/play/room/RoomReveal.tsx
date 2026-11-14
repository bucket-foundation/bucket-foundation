"use client";

import { betweenRoundsAd } from "@/lib/lobby/ads";
import { promptFor, type Phase } from "@/lib/lobby/client";
import { powerNote, timerWidth } from "@/lib/lobby/room";
import { Button } from "@/ui";
import app from "../../app/app.module.css";
import Ad from "../Ad";
import { WorldStage } from "../GameWorld";
import styles from "../play.module.css";
import Reveal, { RevealBanner } from "../Reveal";
import { RoomHud, RoomSide } from "./RoomBits";
import type { LiveRoom } from "./useRoomGame";

type RevealPhase = Extract<Phase, { kind: "reveal" }>;

export function RoomReveal({ g, phase }: { g: LiveRoom; phase: RevealPhase }) {
  const { lobby, picked, breaks } = g;
  const prompt = promptFor(lobby, phase.index);
  const key = `${lobby.startedAt}:${phase.index}`;
  const hidden = g.skipped === key;
  const total = lobby.revealSeconds || 1;
  return (
    <div className={app.stack} data-testid="room">
      <RoomHud g={g} phase={phase} />
      <WorldStage id={g.worldId}>
      <div className={styles.stage}>
        <div className={styles.arena}>
          <div className={styles.nextRound} data-testid="next-round">
            <span>Next round in <b data-testid="next-round-count">{Math.max(1, Math.ceil(phase.remaining))}</b></span>
            <div className={styles.timer} aria-hidden="true">
              <div className={styles.timerFill} style={{ width: timerWidth(phase.remaining, total) }} />
            </div>
            {!hidden ? (
              <Button variant="ghost" size="md" onClick={() => g.setSkipped(key)} data-testid="skip-reveal">Skip</Button>
            ) : null}
          </div>
          {prompt ? <RevealBanner prompt={prompt} pick={picked && picked.round === phase.index && picked.game === lobby.startedAt && !picked.pending ? picked : null} /> : null}
          {lobby.game === "duel" && phase.index + 1 < lobby.rounds ? <Powers g={g} round={phase.index + 1} /> : null}
          {hidden ? null : prompt?.reveal?.length ? <Reveal prompt={prompt} rootLang={lobby.root} /> : <p className={app.muted} aria-busy="true">Loading the answers</p>}
          {betweenRoundsAd(lobby.game, phase.index, breaks.games) ? <Ad placement="between-rounds" /> : null}
        </div>
        <RoomSide g={g} phase={phase} />
      </div>
      </WorldStage>
      {g.error ? <p className={app.error} role="alert">{g.error}</p> : null}
    </div>
  );
}

function Powers({ g, round }: { g: LiveRoom; round: number }) {
  const { lobby } = g;
  const note = powerNote(lobby.powers, round);
  const buy = (kind: "double" | "fifty") => void g.act(() => g.api.power(lobby.id, kind));
  return (
    <section className={styles.powers} data-testid="powers" aria-label="Power-ups">
      <p className={styles.powersHead}>
        Power-up for round {round + 1} <span className={styles.coins}>🪙 {lobby.coins}</span>
      </p>
      {note !== null ? (
        <p className={app.small} data-testid="power-set">{note}</p>
      ) : (
        <div className={styles.powerRow}>
          <button type="button" className={styles.power} disabled={lobby.coins < 2} onClick={() => buy("double")} data-testid="power-double">
            <b>Double points</b>
            <span>2 coins</span>
          </button>
          <button type="button" className={styles.power} disabled={lobby.coins < 1} onClick={() => buy("fifty")} data-testid="power-fifty">
            <b>50/50</b>
            <span>1 coin</span>
          </button>
        </div>
      )}
    </section>
  );
}

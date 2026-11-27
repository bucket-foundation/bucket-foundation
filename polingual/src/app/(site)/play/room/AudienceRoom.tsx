"use client";

import { useState } from "react";
import { normalizeLobbyCode } from "@academy/lobbies";
import { useNow } from "@/lib/hooks/clock";
import { phaseAt, promptFor, standings } from "@/lib/lobby/client";
import { tvChoice } from "@/lib/lobby/tv";
import { roundTitle } from "@/lib/lobby/waiting";
import { Button, ButtonLink } from "@/ui";
import app from "../../app/app.module.css";
import { gameName } from "../langs";
import styles from "../play.module.css";
import { usePlay } from "../usePlay";
import { ReactionBar } from "./ReactionBar";
import { useRoomSync } from "./useRoomSync";

export function AudienceOffer({ onPick }: { onPick: (band: "13to17" | "18plus") => void }) {
  const [young, setYoung] = useState(false);
  return (
    <section className={app.stackSm} data-testid="audience-offer">
      <h2 className={app.title}>Watch as audience</h2>
      <p className={app.muted}>Every seat is taken. The audience votes on each question and sends reactions to the screen.</p>
      {young ? (
        <p className={app.small} data-testid="audience-young">Players under 13 take a seat in the game. Ask the host to free one.</p>
      ) : (
        <div className={app.row}>
          <Button onClick={() => onPick("18plus")} data-testid="audience-adult">I am 18 or older</Button>
          <Button variant="ghost" onClick={() => onPick("13to17")} data-testid="audience-teen">I am 13 to 17</Button>
          <Button variant="quiet" size="sm" onClick={() => setYoung(true)} data-testid="audience-child">I am under 13</Button>
        </div>
      )}
    </section>
  );
}

export function AudienceRoom({ code: rawCode, band }: { code: string; band: string }) {
  const code = normalizeLobbyCode(rawCode);
  const { state, api } = usePlay();
  const ready = state.status === "ready";
  const sync = useRoomSync(api, code, ready ? state.nickname : "", ready, false, band);
  const now = useNow(250) + sync.offset;
  const [voted, setVoted] = useState<Record<number, string>>({});
  const lobby = sync.lobby;
  if (!lobby) return <p className={sync.error ? app.error : app.muted} role={sync.error ? "alert" : undefined}>{sync.error ?? "Joining the audience"}</p>;
  const phase = phaseAt(lobby, now);
  const prompt = phase.kind === "round" ? promptFor(lobby, phase.index) : null;
  const title = roundTitle(lobby) ?? gameName(lobby.game ?? "daily");
  const vote = (choice: string) => {
    if (phase.kind !== "round") return;
    setVoted((v) => ({ ...v, [phase.index]: choice }));
    void api.signal(lobby.id, { round: phase.index, choice }).catch(() => undefined);
  };
  return (
    <div className={app.stack} data-testid="audience-room">
      <section className={app.stackSm}>
        <p className={app.label}>Audience</p>
        <h2 className={app.title}>{title}</h2>
      </section>
      {prompt && phase.kind === "round" ? (
        <section className={app.stackSm} aria-label="Vote">
          <p className={app.muted}>Which one means <b>{prompt.gloss}</b>?</p>
          <div className={styles.voteGrid}>
            {prompt.choices.map((c) => (
              <Button key={c} variant={voted[phase.index] === c ? "primary" : "ghost"} onClick={() => vote(c)} data-testid="audience-vote">
                {tvChoice(c)}
              </Button>
            ))}
          </div>
        </section>
      ) : (
        <p className={app.muted} data-testid="audience-wait">{lobby.status === "done" ? "Game over. The next game starts soon." : "Votes open when the next question starts."}</p>
      )}
      <ReactionBar api={api} lobbyId={lobby.id} />
      <ol className={styles.players} data-testid="audience-scores">
        {standings(lobby).slice(0, 5).map((p) => (
          <li key={p.userId} className={styles.player}>
            <span className={styles.playerName}>{p.name}</span>
            <span className={styles.score}>{p.score}</span>
          </li>
        ))}
      </ol>
      <ButtonLink variant="quiet" size="sm" href="/play">Leave</ButtonLink>
    </div>
  );
}

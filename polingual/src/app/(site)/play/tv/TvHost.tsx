"use client";

import { useEffect, useRef, useState } from "react";
import { normalizeLobbyCode } from "@academy/lobbies";
import { useNow } from "@/lib/hooks/clock";
import { phaseAt, type WebLobbyState } from "@/lib/lobby/client";
import { TV_ORIGIN, tvJoinUrl, tvShortUrl, tvKey, tvPlayers, tvRound, tvSfx, tvTrack, type TvBeat } from "@/lib/lobby/tv";
import type { Stage as AudioStage } from "@/lib/stoa/stage";
import { ButtonLink, Pill, Stage, Tag } from "@/ui";
import { Brand, Standings } from "../../live/parts";
import Qr from "../../live/Qr";
import { MixBar, useStage } from "../../live/show";
import styles from "../../live/stoa.module.css";
import Nickname from "../Nickname";
import { gameName } from "../langs";
import { savedNickname, usePlay } from "../usePlay";
import { useRoomSync } from "../room/useRoomSync";

const TICK_MS = 250;

function useTvSound(lobby: WebLobbyState | null, now: number, stage: AudioStage) {
  const beat = useRef<TvBeat | null>(null);
  useEffect(() => {
    if (!lobby) return;
    const phase = phaseAt(lobby, now);
    const next = { key: tvKey(lobby.startedAt, phase), players: tvPlayers(lobby).length };
    stage.play(tvTrack(phase));
    for (const s of tvSfx(beat.current, next)) stage.sfx(s);
    beat.current = next;
  }, [lobby, now, stage]);
}

export default function TvHost({ code: rawCode }: { code: string }) {
  const code = normalizeLobbyCode(rawCode);
  const { state, api, connect } = usePlay();
  const ready = state.status === "ready";
  const sync = useRoomSync(api, code, ready ? state.nickname : "", ready, true);
  const now = useNow(TICK_MS) + sync.offset;
  const { stage, mix, setMix, ready: soundReady, unlock } = useStage({ music: true, voice: false, sfx: true });
  const [origin, setOrigin] = useState(TV_ORIGIN);
  useEffect(() => setOrigin(window.location.origin), []);
  useTvSound(sync.lobby, now, stage);

  const view = <TvView code={code} play={{ state, connect }} sync={sync} now={now} origin={origin} />;

  return (
    <div className={styles.page} onClick={unlock} onTouchEnd={unlock} onKeyDown={unlock}>
      <Stage ground="lattice" testId="tv">
        <header className={styles.bar}>
          <Brand />
          <MixBar mix={mix} setMix={setMix} ready={soundReady} unlock={unlock} full={false} />
        </header>
        <main className={styles.main}>{view}</main>
      </Stage>
    </div>
  );
}

function TvView({ code, play, sync, now, origin }: { code: string | null; play: Pick<ReturnType<typeof usePlay>, "state" | "connect">; sync: ReturnType<typeof useRoomSync>; now: number; origin: string }) {
  const { state, connect } = play;
  const ready = state.status === "ready";
  if (!code) {
    return (
      <>
        <p className={styles.error} role="alert">That code is not valid. Codes have 6 letters and numbers.</p>
        <ButtonLink variant="ghost" size="md" href="/play">Back to lobbies</ButtonLink>
      </>
    );
  }
  if (!ready) {
    return (
      <div data-testid="tv-gate">
        <p className={styles.label}>TV for lobby {code}</p>
        {state.status === "error" ? <p className={styles.error} role="alert">{state.message}</p> : null}
        {state.status === "loading" ? <p className={styles.muted} aria-busy="true">Loading</p> : <Nickname initial={savedNickname()} onSubmit={(n) => void connect(n)} />}
      </div>
    );
  }
  if (!sync.lobby) return sync.error ? <p className={styles.error} role="alert">{sync.error}</p> : <p className={styles.muted} aria-busy="true">Opening the room</p>;
  return <TvBoard lobby={sync.lobby} now={now} url={tvJoinUrl(origin, code)} />;
}

function TvBoard({ lobby, now, url }: { lobby: WebLobbyState; now: number; url: string }) {
  const phase = phaseAt(lobby, now);
  const round = tvRound(lobby, phase);
  const rows = tvPlayers(lobby);
  return (
    <div data-testid="tv-board" data-phase={phase.kind}>
      <section aria-label="Join">
        <p className={styles.label}>{gameName(lobby.game)}</p>
        <h1 data-testid="tv-code">{lobby.code}</h1>
        <p className={styles.muted}>{tvShortUrl(url)}</p>
        <Qr text={url} />
      </section>
      <section aria-label="Round" data-testid="tv-round">
        <Tag>{round.label}</Tag>
        {round.seconds !== null ? <p data-testid="tv-seconds">{round.seconds}</p> : null}
        {round.gloss ? <h2>{round.gloss}</h2> : null}
        {round.choices.length ? (
          <div role="list">
            {round.choices.map((c) => (
              <Pill key={c} role="listitem" active={round.answer === c} tabIndex={-1}>{c}</Pill>
            ))}
          </div>
        ) : null}
      </section>
      <section aria-label="Players">
        {rows.length ? <Standings rows={rows} testId="tv-players" /> : <p className={styles.muted}>Scan the code to join.</p>}
      </section>
    </div>
  );
}

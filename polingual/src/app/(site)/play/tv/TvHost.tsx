"use client";

import { useEffect, useRef, useState } from "react";
import { normalizeLobbyCode } from "@academy/lobbies";
import { useNow } from "@/lib/hooks/clock";
import { phaseAt, type WebLobbyState } from "@/lib/lobby/client";
import { secondsUntil } from "@/lib/lobby/room";
import { TV_ORIGIN, tvChoice, tvTotals, tvJoinUrl, tvShortUrl, tvKey, tvPlayers, tvRound, tvSfx, tvTrack, type TvBeat } from "@/lib/lobby/tv";
import type { Stage as AudioStage } from "@/lib/stoa/stage";
import { createPortal } from "react-dom";
import { ButtonLink, Pill, Tag } from "@/ui";
import { Brand, Standings } from "../../live/parts";
import Qr from "../../live/Qr";
import { MixBar, Podium, useStage } from "../../live/show";
import styles from "../../live/stoa.module.css";
import tv from "./tv.module.css";
import Nickname from "../Nickname";
import { gameName } from "../langs";
import { usePauseAds } from "../AdsContext";
import { WaitingBoard } from "../room/WaitingBoard";
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
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setOrigin(window.location.origin);
    setHost(document.body);
  }, []);
  useTvSound(sync.lobby, now, stage);
  usePauseAds(true);

  const screen = (
    <div className={`${styles.page} ${tv.screen}`} data-testid="tv" onClick={unlock} onTouchEnd={unlock} onKeyDown={unlock}>
      <div className={tv.frame}>
        <header className={tv.bar}>
          <Brand link={false} />
          <MixBar mix={mix} setMix={setMix} ready={soundReady} unlock={unlock} full={false} />
        </header>
        <main className={tv.main}>
          <TvView code={code} play={{ state, connect, api }} sync={sync} now={now} origin={origin} />
        </main>
      </div>
    </div>
  );
  return host ? createPortal(screen, host) : null;
}

function TvView({ code, play, sync, now, origin }: { code: string | null; play: Pick<ReturnType<typeof usePlay>, "state" | "connect" | "api">; sync: ReturnType<typeof useRoomSync>; now: number; origin: string }) {
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
  const url = tvJoinUrl(origin, code);
  if (phaseAt(sync.lobby, now).kind === "waiting") return <WaitingBoard lobby={sync.lobby} joinUrl={url} tv host={{ api: play.api, take: sync.take }} />;
  return <TvBoard lobby={sync.lobby} now={now} url={url} />;
}

function TvBoard({ lobby, now, url }: { lobby: WebLobbyState; now: number; url: string }) {
  const phase = phaseAt(lobby, now);
  const rows = lobby.ended ? tvTotals(lobby) : tvPlayers(lobby);
  return (
    <div className={tv.board} data-testid="tv-board" data-phase={phase.kind}>
      <section className={tv.join} aria-label="Join">
        <p className={tv.label}>{gameName(lobby.game)}</p>
        <p className={tv.code} data-testid="tv-code">{lobby.code}</p>
        <div className={tv.qr}>
          <Qr text={url} />
        </div>
        <p className={tv.url} data-testid="tv-url">{tvShortUrl(url)}</p>
      </section>
      <section className={tv.round} aria-label="Round" data-testid="tv-round">
        <TvCenter lobby={lobby} now={now} />
      </section>
      <section className={tv.standings} aria-label="Standings">
        <p className={tv.label}>Standings</p>
        {rows.length ? <Standings rows={rows} testId="tv-players" /> : <p className={tv.empty}>Scan the code to join.</p>}
      </section>
    </div>
  );
}

function TvCenter({ lobby, now }: { lobby: WebLobbyState; now: number }) {
  const phase = phaseAt(lobby, now);
  const round = tvRound(lobby, phase);
  if (lobby.ended) {
    return (
      <>
        <Tag>Final scores</Tag>
        <Podium rows={tvTotals(lobby)} />
      </>
    );
  }
  if (phase.kind === "finished") {
    const left = secondsUntil(lobby.nextStartAt, now);
    return (
      <>
        <Tag>Final scores</Tag>
        <Podium rows={tvPlayers(lobby)} />
        {left !== null ? <p className={tv.next} data-testid="tv-next">Next game in <b>{left}s</b></p> : null}
      </>
    );
  }
  return (
    <>
      <Tag>{round.label}</Tag>
      {round.seconds !== null ? <p className={tv.count} data-testid="tv-seconds">{round.seconds}</p> : null}
      {round.gloss ? <h2 className={tv.word} data-testid="tv-prompt">{round.gloss}</h2> : null}
      {round.choices.length ? (
        <div className={tv.choices} role="list">
          {round.choices.map((c) => (
            <Pill key={c} role="listitem" active={round.answer === tvChoice(c)} tabIndex={-1}>{tvChoice(c)}</Pill>
          ))}
        </div>
      ) : null}
    </>
  );
}

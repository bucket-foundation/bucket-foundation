"use client";

import { useEffect, useRef, useState } from "react";
import { normalizeLobbyCode } from "@academy/lobbies";
import { useNow } from "@/lib/hooks/clock";
import { LobbyError, lobbyError, phaseAt, type LobbyApi, type WebLobbyState } from "@/lib/lobby/client";
import { everyoneReady, roomControls, secondsUntil } from "@/lib/lobby/room";
import { TV_ORIGIN, tvAtlasClip, tvChoice, tvTotals, tvJoinUrl, tvShortUrl, tvKey, tvPlayers, tvRound, tvSfx, tvTrack, type TvBeat, type TvClip } from "@/lib/lobby/tv";
import { play as speak } from "@/lib/speak";
import type { Stage as AudioStage } from "@/lib/stoa/stage";
import { createPortal } from "react-dom";
import { Button, ButtonLink, Pill, Tag } from "@/ui";
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

export default function TvHost({ code: rawCode, onPlay }: { code: string; onPlay?: () => void }) {
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
    const frame = document.querySelector<HTMLElement>("[data-testid=play-frame]");
    if (!frame) return;
    const prior = frame.style.display;
    frame.style.display = "none";
    return () => {
      frame.style.display = prior;
    };
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
          <TvView code={code} play={{ state, connect, api }} sync={sync} now={now} origin={origin} onPlay={onPlay} />
        </main>
      </div>
    </div>
  );
  return host ? createPortal(screen, host) : null;
}

function TvView({ code, play, sync, now, origin, onPlay }: { code: string | null; play: Pick<ReturnType<typeof usePlay>, "state" | "connect" | "api">; sync: ReturnType<typeof useRoomSync>; now: number; origin: string; onPlay?: () => void }) {
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
  const board = phaseAt(sync.lobby, now).kind === "waiting" ? <WaitingBoard lobby={sync.lobby} joinUrl={url} tv host={{ api: play.api, take: sync.take }} /> : <TvBoard lobby={sync.lobby} now={now} url={url} />;
  if (!sync.lobby.isHost) return board;
  const nickname = state.status === "ready" ? state.nickname : "";
  return (
    <>
      {board}
      <HostBar lobby={sync.lobby} now={now} api={play.api} take={sync.take} nickname={nickname} onPlay={onPlay} />
    </>
  );
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

function TvAtlas({ clip }: { clip: TvClip | null }) {
  const key = clip ? `${clip.kind}:${clip.lang}:${clip.text}` : "";
  useEffect(() => {
    if (clip?.kind === "audio") void speak({ id: `tv-atlas:${clip.text}`, text: clip.text, lang: clip.lang });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!clip) return null;
  return (
    <>
      <h2 className={tv.word} data-testid="tv-prompt" lang={clip.lang ?? undefined}>{clip.text}</h2>
      {clip.kind === "text" ? <p className={tv.next} data-testid="tv-atlas-text">This clip is not cleared to play on a shared screen. Read the word instead.</p> : null}
    </>
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
      <span className={tv.roundTag}><Tag>{round.label}</Tag></span>
      {round.seconds !== null ? <p className={tv.count} data-testid="tv-seconds">{round.seconds}</p> : null}
      {lobby.game === "atlas" && phase.kind === "round" ? <TvAtlas clip={tvAtlasClip(lobby.prompts.find((p) => p.round === phase.index) ?? null)} /> : null}
      {round.gloss && lobby.game !== "atlas" ? <h2 className={tv.word} data-testid="tv-prompt">{round.gloss}</h2> : null}
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

function HostBar({ lobby, now, api, take, nickname, onPlay }: { lobby: WebLobbyState; now: number; api: LobbyApi; take: (l: WebLobbyState, sentAt: number) => void; nickname: string; onPlay?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const phase = phaseAt(lobby, now);
  const act = async (fn: () => Promise<WebLobbyState>, after?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      const sentAt = Date.now();
      take(await fn(), sentAt);
      after?.();
    } catch (err) {
      setError(lobbyError(err instanceof LobbyError ? err.code : undefined));
    } finally {
      setBusy(false);
    }
  };
  const can = roomControls(lobby);
  return (
    <nav className={tv.hostBar} aria-label="Host controls" data-testid="host-bar">
      {can.start ? (
        <Button size="lg" disabled={busy || !everyoneReady(lobby)} onClick={() => void act(() => api.start(lobby.id))} data-testid="start">
          Start game
        </Button>
      ) : null}
      {can.nextNow && phase.kind === "finished" && !lobby.ended ? (
        <Button size="lg" disabled={busy} onClick={() => void act(() => api.next(lobby.id))} data-testid="next-now">
          Next game
        </Button>
      ) : null}
      {can.settings && onPlay ? (
        <Button variant="ghost" size="lg" disabled={busy} onClick={() => void act(() => api.hostMode(lobby.id, false, nickname), onPlay)} data-testid="mode-play">
          Play on this device
        </Button>
      ) : null}
      {lobby.canEnd && !lobby.ended ? (
        <Button variant="ghost" size="lg" disabled={busy} onClick={() => void act(() => api.end(lobby.id))} data-testid="end-game">
          Close lobby
        </Button>
      ) : null}
      {lobby.status === "lobby" && !everyoneReady(lobby) ? <span className={tv.hint}>Start opens when every player is ready.</span> : null}
      {error ? <span className={tv.hint} role="alert">{error}</span> : null}
    </nav>
  );
}

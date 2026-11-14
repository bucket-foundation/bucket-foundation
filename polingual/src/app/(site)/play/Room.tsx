"use client";

import Interstitial from "./Interstitial";
import RoomMissed from "./RoomMissed";
import { SceneHold, TilesHold } from "./LazyHolds";
import { RoomChat, RoomHeader } from "./RoomParts";
import { useNow } from "@/lib/hooks/clock";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeLobbyCode } from "@academy/lobbies";
import { tappedChoice } from "@academy/lobby-tiles";
import { answeredRound, botLabel, flagEmoji, gameProgress, LEARN_HREF, ranked, livesLeft, streakOf, LobbyError, lobbyError, myScore, phaseAt, promptFor, serverOffset, shareUrl, standings, type WebLobbyState } from "@/lib/lobby/client";
import { LANGS } from "@academy/lang-systems";
import { TileFace } from "@/app/tile";
import { LangCard } from "./LearnWord";
import LiveBoard from "./LiveBoard";
import app from "../app/app.module.css";
import Ad from "./Ad";
import { gameName, langName } from "./langs";
import Nickname from "./Nickname";
import Reveal, { RevealBanner } from "./Reveal";
import GameWorld, { pieceClass, WorldStage } from "./GameWorld";
import { CoinArt, PromptCard } from "./Pieces";
import RoomQr, { useJoinUrl } from "./RoomQr";
import world from "./world.module.css";
import { WORLDS, type WorldId } from "@/ui/art/play";
import { useAdsVisible } from "./AdsContext";
import { useAccount } from "./Account";
import { betweenRoundsAd, interstitialDue } from "@/lib/lobby/ads";
import { readBreaks, writeBreaks, type Breaks } from "@/lib/lobby/breaks";
import { parseTile } from "@academy/lobby-tiles";
import { FlagSquare } from "./LearnWord";
import spyStyles from "./ispy/ispy.module.css";
import { sceneOfChoices } from "@academy/ispy";
import { play, readMuted, writeMuted } from "@/lib/lobby/sound";
import type { LobbySummary } from "@/lib/lobby/client";
import styles from "./play.module.css";
import { Avatar } from "@/ui/avatar";
import { savedNickname, usePlay } from "./usePlay";
import { Button, ButtonLink, Pill } from "@/ui";

const Tiles = dynamic(() => import("./Tiles"), { loading: () => <TilesHold /> });
const Scene = dynamic(() => import("./ispy/Scene"), { loading: () => <SceneHold /> });

const POLL_MS = 1000;
const TICK_MS = 200;

type Picked = { game: string | null; round: number; choice: string; correct: boolean; points: number; pending?: boolean };

function errorOf(err: unknown): string {
  return lobbyError(err instanceof LobbyError ? err.code : undefined);
}

function RoomGame({ code: rawCode, onGame }: { code: string; onGame: (g: WorldId, code: string) => void }) {
  const router = useRouter();
  const code = normalizeLobbyCode(rawCode);
  const { state, api, connect } = usePlay();
  const [lobby, setLobby] = useState<WebLobbyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const now = useNow(TICK_MS);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [chat, setChat] = useState("");
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(false);
  const [next, setNext] = useState<LobbySummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [skipped, setSkipped] = useState("");
  const [kick, setKick] = useState(0);
  const [breaks, setBreaks] = useState<Breaks>({ games: 0, lastInterstitial: null });
  const [interstitial, setInterstitial] = useState(false);
  const worldId: WorldId = !lobby ? "duel" : lobby.game === "spy" ? "ispy" : lobby.game === "daily" || lobby.game === "live" ? "same-word" : lobby.game in WORLDS ? (lobby.game as WorldId) : "duel";
  useEffect(() => {
    if (lobby) onGame(worldId, lobby.code);
  }, [lobby, worldId, onGame]);
  const [rewarded, setRewarded] = useState(false);
  const adsVisible = useAdsVisible();
  const account = useAccount();
  useEffect(() => setBreaks(readBreaks(() => window.localStorage)), []);
  const lastRound = useRef<string>("");
  const cheered = useRef<string>("");
  useEffect(() => setMuted(readMuted(() => window.localStorage)), []);
  const version = useRef<number | undefined>(undefined);
  const ready = state.status === "ready";
  const nickname = state.status === "ready" ? state.nickname : "";

  const take = useCallback((next: WebLobbyState, sentAt: number) => {
    version.current = next.version;
    setOffset(serverOffset(next.now, sentAt, Date.now()));
    setLobby(next);
  }, []);

  useEffect(() => {
    if (!ready || !code) return;
    let stop = false;
    const sentAt = Date.now();
    api
      .join({ code, displayName: nickname })
      .then((l) => !stop && take(l, sentAt))
      .catch((err) => !stop && setError(errorOf(err)));
    return () => {
      stop = true;
    };
  }, [api, code, nickname, ready, take]);

  const id = lobby?.id;
  useEffect(() => {
    if (!id) return;
    let busy = false;
    const pull = async () => {
      if (busy) return;
      busy = true;
      const sentAt = Date.now();
      try {
        const res = await api.state(id, version.current);
        if (res.changed && res.lobby) take(res.lobby, sentAt);
        setError(null);
      } catch (err) {
        setError(errorOf(err));
      } finally {
        busy = false;
      }
    };
    if (kick > 0) void pull();
    const t = window.setInterval(() => void pull(), POLL_MS);
    return () => window.clearInterval(t);
  }, [api, id, take, kick]);


  const livePhase = lobby ? phaseAt(lobby, now + offset) : null;
  const roundKey = livePhase?.kind === "round" || livePhase?.kind === "reveal" ? `${lobby?.startedAt}:${livePhase.kind}:${livePhase.index}` : livePhase?.kind ?? "";
  useEffect(() => {
    if (!roundKey || roundKey === lastRound.current) return;
    lastRound.current = roundKey;
    if (roundKey.includes(":round:")) play("round", muted);
    if (roundKey.includes(":reveal:") || roundKey === "finished") setKick((k) => k + 1);
    if (roundKey === "finished" && cheered.current !== lobby?.startedAt) {
      cheered.current = lobby?.startedAt ?? "";
      play("win", muted);
      const stored = readBreaks(() => window.localStorage);
      const games = stored.games + 1;
      const now = Date.now();
      const show = adsVisible && interstitialDue(games, stored.lastInterstitial, now);
      const next = { games, lastInterstitial: show ? now : stored.lastInterstitial };
      writeBreaks(() => window.localStorage, next);
      setBreaks(next);
      if (show) setInterstitial(true);
    }
  }, [roundKey, muted, lobby?.startedAt, adsVisible]);
  useEffect(() => {
    if (livePhase?.kind !== "finished" || !ready || lobby?.standing) return;
    let stop = false;
    api
      .listing()
      .then((res) => {
        if (stop) return;
        const rooms = res.lobbies.filter((l) => l.standing && l.id !== lobby?.id);
        setNext(rooms.find((l) => l.game === lobby?.game) ?? rooms[0] ?? null);
      })
      .catch(() => undefined);
    return () => {
      stop = true;
    };
  }, [livePhase?.kind, ready, api, lobby?.id, lobby?.game, lobby?.standing]);

  if (!code) {
    return (
      <div className={app.stack}>
        <p className={app.error} role="alert">That code is not valid. Codes have 6 letters and numbers.</p>
        <ButtonLink variant="ghost" size="md" href="/play">Back to lobbies</ButtonLink>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className={app.stack} data-testid="room-gate">
        <p className={app.label}>Lobby {code}</p>
        <h2 className={app.title}>Pick a nickname to join</h2>
        {state.status === "error" ? <p className={app.error} role="alert">{state.message}</p> : null}
        {state.status === "loading" ? <p className={app.muted} aria-busy="true">Loading</p> : <Nickname initial={savedNickname()} onSubmit={(n) => void connect(n)} />}
      </div>
    );
  }

  if (!lobby) {
    return (
      <div className={app.stack}>
        <p className={app.label}>Lobby {code}</p>
        {error ? (
          <>
            <p className={app.error} role="alert">{error}</p>
            <ButtonLink variant="ghost" size="md" href="/play">Back to lobbies</ButtonLink>
          </>
        ) : (
          <p className={app.muted} aria-busy="true">Joining</p>
        )}
      </div>
    );
  }

  const phase = phaseAt(lobby, now + offset);
  const me = lobby.players.find((p) => p.isMe);
  const board = standings(lobby);

  const act = async (fn: () => Promise<WebLobbyState>) => {
    const sentAt = Date.now();
    try {
      take(await fn(), sentAt);
      setError(null);
    } catch (err) {
      setError(errorOf(err));
    }
  };

  const answer = async (round: number, choice: string) => {
    if ((picked?.round === round && picked.game === lobby.startedAt) || answeredRound(lobby, round)) return;
    const game = lobby.startedAt;
    setPicked({ game, round, choice, correct: false, points: 0, pending: true });
    const sentAt = Date.now();
    try {
      const res = await api.answer(lobby.id, round, choice);
      setPicked({ game, round, choice, correct: res.correct, points: res.points });
      play(res.correct ? "hit" : "miss", muted);
      take(res.lobby, sentAt);
    } catch (err) {
      if (!(err instanceof LobbyError && err.code === "already_answered")) setPicked((p) => (p?.round === round ? null : p));
      setError(errorOf(err));
    }
  };

  const toggleMute = () => {
    writeMuted(() => window.localStorage, !muted);
    setMuted(!muted);
  };

  const newLobby = async (bots: boolean) => {
    if (state.status !== "ready" || busy) return;
    setBusy(true);
    try {
      const created = await api.create({ name: `${state.nickname}'s lobby`, root: lobby.root, targets: lobby.targets, rounds: lobby.rounds, roundSeconds: lobby.roundSeconds, listed: true, displayName: state.nickname, game: lobby.game, fillBots: bots });
      if (bots) await api.fillBots(created.id).catch(() => undefined);
      router.push(`/play/${created.code}`);
    } catch (err) {
      setError(errorOf(err));
      setBusy(false);
    }
  };

  const toolbar = (
    <div className={styles.toolbar}>
      <span className={styles.flames} data-testid="streak" data-on={streakOf(lobby) >= 2}>
        {streakOf(lobby) >= 2 ? `🔥 ${streakOf(lobby)} in a row` : ""}
      </span>
      <Pill size="sm" onClick={toggleMute} aria-pressed={muted} data-testid="mute">
        {muted ? "🔇 Sound off" : "🔊 Sound on"}
      </Pill>
    </div>
  );

  const leave = async () => {
    try {
      await api.leave(lobby.id);
    } catch {
    }
    router.push("/play");
  };

  const share = async () => {
    const url = shareUrl(window.location.origin, lobby.code);
    try {
      if (navigator.share) await navigator.share({ title: "Polingual lobby", text: `Join my Polingual lobby with code ${lobby.code}`, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch {
    }
  };

  const scoreboard = (
    <ol className={styles.players} data-testid="players">
      {board.map((p) => (
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

  const chatBox = <RoomChat lobby={lobby} chat={chat} setChat={setChat} onSend={(body) => void act(() => api.chat(lobby.id, body))} />;

  const header = <RoomHeader lobby={lobby} />;

  if (phase.kind === "waiting") {
    const readyCount = lobby.players.filter((p) => p.ready).length;
    const startsIn = lobby.nextStartAt ? Math.max(0, Math.ceil((Date.parse(lobby.nextStartAt) - now - offset) / 1000)) : null;
    return (
      <div className={app.stack} data-testid="room">
        {header}
        {toolbar}
        <div className={app.row}>
          <Button variant="ghost" size="md" onClick={() => void share()}>{copied ? "Link copied" : "Share link"}</Button>
          <Button variant="quiet" size="sm" onClick={() => void leave()}>Leave</Button>
          {state.identity.kind === "guest" ? <Button variant="quiet" size="sm" onClick={account.openSignIn} data-testid="room-sign-in">Sign in</Button> : null}
        </div>
        <div className={styles.split}>
          <section className={app.stackSm}>
            {scoreboard}
            <div className={app.row}>
              <Button variant={me?.ready ? "ghost" : "primary"} size={me?.ready ? "md" : "lg"} onClick={() => void act(() => api.ready(lobby.id, !me?.ready))} data-testid="ready">
                {me?.ready ? "Not ready" : "Ready"}
              </Button>
              {lobby.isHost && lobby.botsEnabled && !lobby.botFill ? (
                <Button variant="ghost" size="md" onClick={() => void act(() => api.fillBots(lobby.id))} data-testid="fill-bots">
                  Fill with bots
                </Button>
              ) : null}
              {lobby.isHost ? (
                <Button disabled={readyCount < 2} onClick={() => void act(() => api.start(lobby.id))} data-testid="start">
                  Start game
                </Button>
              ) : null}
            </div>
            <div className={styles.startsIn} data-testid="next-start">
              {startsIn !== null ? (
                <>
                  <span>Next game: {gameName(lobby.game)}</span>
                  <b data-testid="next-start-count">{startsIn}s</b>
                </>
              ) : (
                <span>{lobby.standing ? "The next game starts soon." : readyCount < 2 ? "Starts 15 seconds after two players are ready." : lobby.isHost ? "Everyone ready? Start now or wait for the countdown." : "The host can start now."}</span>
              )}
            </div>
            {lobby.setup !== "single" ? <p className={app.small} data-testid="setup-line">{lobby.setup === "mix" ? "Random mix of games" : `Game set: ${lobby.playlist.map(gameName).join(", ")}`}</p> : null}
          </section>
          {chatBox}
        </div>
        {error ? <p className={app.error} role="alert">{error}</p> : null}
      </div>
    );
  }

  const doubled = (round: number) => lobby.powers.some((p) => p.round === round && p.kind === "double");
  const buy = (kind: "double" | "fifty") => void act(() => api.power(lobby.id, kind));
  const lives = lobby.game === "tiles" && (phase.kind === "round" || phase.kind === "reveal") ? livesLeft(lobby, phase.kind === "round" ? phase.index : phase.index + 1) : null;
  const streak = streakOf(lobby);
  const rank = ranked(lobby.players).find((p) => p.isMe)?.rank ?? null;
  const hud = (
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
        {lives !== null ? <span className={styles.lives} data-testid="lives" aria-label={`${lives} lives left`}>{"♥".repeat(lives)}{"♡".repeat(Math.max(0, 3 - lives))}</span> : null}
        <Pill size="sm" onClick={toggleMute} aria-pressed={muted} aria-label={muted ? "Sound off" : "Sound on"} data-testid="mute">
          {muted ? "🔇" : "🔊"}
        </Pill>
      </div>
      <div className={styles.gameBar} role="progressbar" aria-label="Game progress" aria-valuemin={0} aria-valuemax={lobby.rounds} aria-valuenow={Math.round(gameProgress(phase, lobby.rounds) * lobby.rounds)} data-testid="game-progress">
        <div style={{ width: `${gameProgress(phase, lobby.rounds) * 100}%` }} />
      </div>
    </div>
  );
  const side = (
    <aside className={styles.side}>
      <LiveBoard players={lobby.players} live={phase.kind === "round"} />
    </aside>
  );

  if (phase.kind === "countdown") {
    return (
      <div className={app.stack} data-testid="room">
        {header}
        <WorldStage id={worldId}>
        <div className={styles.stage}>
          <div className={styles.arena}>
            <p className={styles.bigCount} key={Math.ceil(phase.seconds)} data-testid="countdown">{Math.ceil(phase.seconds)}</p>
            <p className={app.small}>{gameName(lobby.game)} · {lobby.rounds} rounds</p>
          </div>
          {side}
        </div>
        </WorldStage>
      </div>
    );
  }

  if (phase.kind === "reveal") {
    const prompt = promptFor(lobby, phase.index);
    const key = `${lobby.startedAt}:${phase.index}`;
    const hidden = skipped === key;
    const total = lobby.revealSeconds || 1;
    return (
      <div className={app.stack} data-testid="room">
        {hud}
        <WorldStage id={worldId}>
        <div className={styles.stage}>
          <div className={styles.arena}>
            <div className={styles.nextRound} data-testid="next-round">
              <span>Next round in <b data-testid="next-round-count">{Math.max(1, Math.ceil(phase.remaining))}</b></span>
              <div className={styles.timer} aria-hidden="true">
                <div className={styles.timerFill} style={{ width: `${Math.max(0, Math.min(100, (phase.remaining / total) * 100))}%` }} />
              </div>
              {!hidden ? (
                <Button variant="ghost" size="md" onClick={() => setSkipped(key)} data-testid="skip-reveal">Skip</Button>
              ) : null}
            </div>
            {prompt ? <RevealBanner prompt={prompt} pick={picked && picked.round === phase.index && picked.game === lobby.startedAt && !picked.pending ? picked : null} /> : null}
            {lobby.game === "duel" && phase.index + 1 < lobby.rounds ? (
              <section className={styles.powers} data-testid="powers" aria-label="Power-ups">
                <p className={styles.powersHead}>
                  Power-up for round {phase.index + 2} <span className={styles.coins}>🪙 {lobby.coins}</span>
                </p>
                {lobby.powers.some((p) => p.round === phase.index + 1) ? (
                  <p className={app.small} data-testid="power-set">{lobby.powers.find((p) => p.round === phase.index + 1)?.kind === "double" ? "Double points is on for the next round." : "50/50 is on for the next round."}</p>
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
            ) : null}
            {hidden ? null : prompt?.reveal?.length ? <Reveal prompt={prompt} rootLang={lobby.root} /> : <p className={app.muted} aria-busy="true">Loading the answers</p>}
            {betweenRoundsAd(lobby.game, phase.index, breaks.games) ? <Ad placement="between-rounds" /> : null}
          </div>
          {side}
        </div>
        </WorldStage>
        {error ? <p className={app.error} role="alert">{error}</p> : null}
      </div>
    );
  }

  if (phase.kind === "round") {
    const prompt = promptFor(lobby, phase.index);
    const mine = picked?.round === phase.index && picked.game === lobby.startedAt ? picked : null;
    const done = !!mine || answeredRound(lobby, phase.index);
    const elapsed = lobby.roundSeconds * 1000 - phase.remaining * 1000;
    const stateOf = (c: string) => (mine ? (mine.choice === c ? (mine.pending ? "pending" : mine.correct ? "right" : "wrong") : "dim") : done ? "dim" : undefined);
    return (
      <div className={app.stack} data-testid="room" data-round="active">
        {hud}
        {mine && !mine.pending && mine.points > 0 ? <p className={styles.pop} key={`${mine.game}:${mine.round}`} data-testid="score-pop">+{mine.points}</p> : null}
        <WorldStage id={worldId}>
        <div className={styles.stage}>
          <div className={styles.arena}>
            <div className={styles.timer} aria-hidden="true">
              <div className={styles.timerFill} style={{ width: `${Math.max(0, Math.min(100, (phase.remaining / lobby.roundSeconds) * 100))}%` }} />
            </div>
            {prompt && prompt.mode === "tiles" ? (
              <>
                <Tiles
                  key={`${lobby.startedAt}:${phase.index}`}
                  gloss={prompt.gloss}
                  choices={prompt.choices}
                  round={phase.index}
                  rounds={lobby.rounds}
                  roundSeconds={lobby.roundSeconds}
                  elapsedMs={elapsed}
                  muted={muted}
                  locked={done || lives === 0}
                  onSubmit={(t) => void answer(phase.index, tappedChoice(t))}
                />
                {mine ? <p className={styles.feedback} data-testid="feedback" aria-busy={mine.pending}>{mine.pending ? "Checking" : mine.correct ? `Perfect. +${mine.points}` : mine.points > 0 ? `Close. +${mine.points}` : "Missed some. -1 life"}</p> : null}
                {lives === 0 ? (
                  <div className={styles.feedback} data-testid="out-of-lives">
                    <p>Out of lives.</p>
                    {adsVisible && !me?.continues ? (
                      rewarded ? (
                        <>
                          <Ad placement="rewarded" testId="ad-rewarded" />
                          <Button onClick={() => { setRewarded(false); void act(() => api.continueRun(lobby.id)); }} data-testid="continue-claim">Continue with one life</Button>
                        </>
                      ) : (
                        <Button variant="ghost" size="md" onClick={() => setRewarded(true)} data-testid="continue-offer">Watch an ad to continue</Button>
                      )
                    ) : (
                      <p className={app.small}>Watch the rest of this game.</p>
                    )}
                  </div>
                ) : null}
              </>
            ) : prompt && prompt.mode === "spy" && sceneOfChoices(prompt.choices) ? (
              <>
                <div className={spyStyles.spy}>
                  <span className={spyStyles.spyLead}>I spy…</span>
                  <span className={spyStyles.spyWord} lang={prompt.lang ?? undefined} dir={prompt.lang && LANGS[prompt.lang]?.rtl ? "rtl" : undefined} data-testid="prompt">{prompt.gloss}</span>
                  {prompt.lang ? <span className={app.small}>{langName(prompt.lang)}</span> : null}
                </div>
                <Scene scene={sceneOfChoices(prompt.choices)!} marks={mine ? { [mine.choice]: mine.pending ? "answer" : mine.correct ? "right" : "wrong" } : {}} locked={done} onTap={(c) => void answer(phase.index, c)} />
              </>
            ) : prompt && prompt.mode === "flag" ? (
              <>
                <div className={styles.prompt}>
                  <p className={app.small}>Which language is this word?</p>
                  <div className={styles.promptTile}>
                    <TileFace as="div" lang="" plain word={prompt.gloss} attrs={{ "data-testid": "prompt" }} />
                  </div>
                </div>
                <ul className={styles.choices}>
                  {prompt.choices.filter((c) => !prompt.hide?.includes(c)).map((c) => (
                    <li key={c}>
                      <button type="button" className={`${styles.choice} ${styles.choiceFlag}`} data-state={stateOf(c)} disabled={done} onClick={() => void answer(phase.index, c)} data-testid="choice">
                        <LangCard lang={c} big />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : prompt && prompt.mode === "meaning" ? (
              <>
                <div className={styles.prompt}>
                  <p className={app.small}>What does this word mean?</p>
                  <div className={styles.promptTile}>
                    <TileFace as="div" lang={prompt.lang ?? ""} word={prompt.gloss} rtl={prompt.lang ? LANGS[prompt.lang]?.rtl : undefined} attrs={{ "data-testid": "prompt" }} />
                  </div>
                  {prompt.lang ? <p className={app.small}>{langName(prompt.lang)}</p> : null}
                </div>
                <ul className={styles.choices}>
                  {prompt.choices.filter((c) => !prompt.hide?.includes(c)).map((c) => (
                    <li key={c}>
                      <button type="button" className={`${styles.choice} ${pieceClass("ticket")}`} data-state={stateOf(c)} disabled={done} onClick={() => void answer(phase.index, c)} data-testid="choice">
                        {c}
                      </button>
                    </li>
                  ))}
                </ul>
                {doubled(phase.index) ? <p className={styles.powerOn} data-testid="double-on">Double points this round</p> : null}
              </>
            ) : prompt && prompt.mode === "mixed" ? (
              <>
                <div className={styles.prompt}>
                  <PromptCard label="Pick the word that means" gloss={prompt.gloss} note="The tiles mix this room's languages. One is right." />
                </div>
                <ul className={styles.choiceTiles}>
                  {prompt.choices.map((c, i) => {
                    const t = parseTile(c);
                    return (
                      <li key={c}>
                        <TileFace
                          as="button"
                          lang={t.lang}
                          word={t.form}
                          rtl={LANGS[t.lang]?.rtl}
                          index={i}
                          className={styles.choiceTile}
                          attrs={{ "data-state": stateOf(c), "data-testid": "choice", "data-lang": t.lang, "aria-label": `${t.form}, ${langName(t.lang)}`, disabled: done, onClick: () => void answer(phase.index, c) }}
                        />
                        <span className={styles.choiceLang}>
                          <FlagSquare lang={t.lang} size={14} />
                          {langName(t.lang)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : prompt ? (
              <>
                <div className={styles.prompt}>
                  <PromptCard label="Pick the word that means" gloss={prompt.gloss} />
                </div>
                <ul className={styles.choiceTiles}>
                  {prompt.choices.map((c, i) => (
                    <li key={c}>
                      <TileFace
                        as="button"
                        lang={prompt.lang ?? ""}
                        plain={!prompt.lang}
                        word={c}
                        rtl={prompt.lang ? LANGS[prompt.lang]?.rtl : undefined}
                        index={i}
                        className={styles.choiceTile}
                        attrs={{ "data-state": stateOf(c), "data-testid": "choice", disabled: done, onClick: () => void answer(phase.index, c) }}
                      />
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className={app.muted} aria-busy="true">Loading the round</p>
            )}
            {mine && prompt?.mode !== "tiles" ? <p className={styles.feedback} data-testid="feedback" aria-busy={mine.pending}>{mine.pending ? "Checking" : mine.points > 0 ? `Right. +${mine.points}` : mine.correct ? "Right." : "Not this time."}</p> : null}
          </div>
          {side}
        </div>
        </WorldStage>
        {error ? <p className={app.error} role="alert">{error}</p> : null}
      </div>
    );
  }

  const startsIn = lobby.nextStartAt ? Math.max(0, Math.ceil((Date.parse(lobby.nextStartAt) - now - offset) / 1000)) : null;
  const guest = state.identity.kind === "guest";
  return (
    <div className={app.stack} data-testid="results">
      <Interstitial open={interstitial} onClose={() => setInterstitial(false)} />
      <section className={app.stackSm}>
        <p className={app.label}>Game over</p>
        <h2 className={app.title}>{board[0]?.isMe ? "🏆 You won" : `${board[0]?.name ?? "Nobody"} wins`}</h2>
      </section>
      {toolbar}
      {scoreboard}
      <section className={styles.nextBar} data-testid="next-ctas">
        {lobby.standing || lobby.nextStartAt ? (
          <span className={styles.nextName} data-testid="next-game">Next game{(lobby.setup ?? "single") === "single" ? `: ${lobby.name}` : ""}{startsIn !== null ? ` in ${startsIn}s` : " in a few seconds"}</span>
        ) : next ? (
          <ButtonLink size="md" href={`/play/${next.code}`} data-testid="next-game">Next game: {next.name}</ButtonLink>
        ) : null}
        <Button variant="ghost" size="md" disabled={busy} onClick={() => void newLobby(false)} data-testid="rematch">Rematch</Button>
        <Button variant="ghost" size="md" disabled={busy} onClick={() => void newLobby(true)} data-testid="play-bots">Play with bots</Button>
        <ButtonLink size="md" href={LEARN_HREF} data-testid="results-learn">Start learning</ButtonLink>
      </section>
      <section className={app.stackSm} data-testid="reveal-all">
        <h2 className={app.fieldLabel}>Every word in this game</h2>
        {lobby.prompts.map((p) => (p.reveal?.length ? <Reveal key={p.round} prompt={p} rootLang={lobby.root} answersOnly /> : null))}
      </section>
      {guest ? (
        <section className={styles.upsell} data-testid="save-progress">
          <b>Save your progress</b>
          <p className={app.small}>You scored {myScore(lobby)} points. Sign in to keep your streak, stats and game history. Your guest games come with you.</p>
          <Button onClick={account.openSignIn} data-testid="save-sign-in">Sign in to save</Button>
        </section>
      ) : null}
      <RoomMissed lobby={lobby} at={now + offset} />
      {breaks.games >= 2 ? <Ad placement="results" /> : null}
      <div className={app.row}>
        <ButtonLink variant="ghost" size="md" href="/play">Back to lobbies</ButtonLink>
      </div>
    </div>
  );
}

export default function Room({ code }: { code: string }) {
  const [room, setRoom] = useState<{ game: WorldId; code: string | null }>({ game: "duel", code: null });
  const onGame = useCallback((game: WorldId, c: string) => setRoom((r) => (r.game === game && r.code === c ? r : { game, code: c })), []);
  return (
    <GameWorld id={room.game} aside={room.code ? <RoomBadge code={room.code} /> : null}>
      <RoomGame code={code} onGame={onGame} />
    </GameWorld>
  );
}

function RoomBadge({ code }: { code: string }) {
  const url = useJoinUrl(code);
  return (
    <div className={world.roomBadge} data-testid="room-badge">
      <span className={world.roomBadgeLabel}>{url ? `Join at ${url.replace(/^https?:\/\//, "").replace(/\/[^/]*$/, "")}` : "Join this room"}</span>
      <b className={world.roomBadgeCode}>{code}</b>
      <RoomQr code={code} />
    </div>
  );
}

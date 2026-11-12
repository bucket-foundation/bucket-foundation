"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeLobbyCode } from "@academy/lobbies";
import { tappedChoice } from "@academy/lobby-tiles";
import { answeredRound, botLabel, flagEmoji, langFlag, LEARN_HREF, livesLeft, streakOf, LobbyError, tallyLate, lobbyError, missedWords, myScore, phaseAt, promptFor, serverOffset, shareUrl, standings, type WebLobbyState } from "@/lib/lobby/client";
import app from "../app/app.module.css";
import Ad from "./Ad";
import { gameName, langName } from "./langs";
import Nickname from "./Nickname";
import Reveal from "./Reveal";
import Tiles from "./Tiles";
import { play, readMuted, writeMuted } from "@/lib/lobby/sound";
import type { LobbySummary } from "@/lib/lobby/client";
import styles from "./play.module.css";
import { savedNickname, usePlay } from "./usePlay";

const POLL_MS = 1000;
const TICK_MS = 200;

type Picked = { game: string | null; round: number; choice: string; correct: boolean; points: number; pending?: boolean };

function errorOf(err: unknown): string {
  return lobbyError(err instanceof LobbyError ? err.code : undefined);
}

export default function Room({ code: rawCode }: { code: string }) {
  const router = useRouter();
  const code = normalizeLobbyCode(rawCode);
  const { state, api, connect } = usePlay();
  const [lobby, setLobby] = useState<WebLobbyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [picked, setPicked] = useState<Picked | null>(null);
  const [chat, setChat] = useState("");
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(false);
  const [next, setNext] = useState<LobbySummary | null>(null);
  const [busy, setBusy] = useState(false);
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
    const t = window.setInterval(async () => {
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
    }, POLL_MS);
    return () => window.clearInterval(t);
  }, [api, id, take]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(t);
  }, []);

  const livePhase = lobby ? phaseAt(lobby, now + offset) : null;
  const roundKey = livePhase?.kind === "round" ? `${lobby?.startedAt}:${livePhase.index}` : livePhase?.kind ?? "";
  useEffect(() => {
    if (!roundKey || roundKey === lastRound.current) return;
    lastRound.current = roundKey;
    if (roundKey.includes(":")) play("round", muted);
    if (roundKey === "finished" && cheered.current !== lobby?.startedAt) {
      cheered.current = lobby?.startedAt ?? "";
      play("win", muted);
    }
  }, [roundKey, muted, lobby?.startedAt]);
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
        <a className={app.ghost} href="/play">Back to lobbies</a>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className={app.stack} data-testid="room-gate">
        <p className={app.label}>Lobby {code}</p>
        <h1 className={app.title}>Pick a nickname to join</h1>
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
            <a className={app.ghost} href="/play">Back to lobbies</a>
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
      <button type="button" className={styles.mute} onClick={toggleMute} aria-pressed={muted} data-testid="mute">
        {muted ? "🔇 Sound off" : "🔊 Sound on"}
      </button>
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
          <span>
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

  const chatBox = (
    <section className={styles.chat} aria-label="Chat">
      <ul className={styles.messages} data-testid="messages">
        {lobby.messages.map((m) => (
          <li key={m.id}>
            <b>{m.name}</b>
            {lobby.players.some((p) => p.userId === m.from && p.bot) ? <span className={styles.tag}> bot</span> : null} {m.body}
          </li>
        ))}
      </ul>
      <form
        className={styles.chatForm}
        onSubmit={(e) => {
          e.preventDefault();
          const body = chat.trim();
          if (!body) return;
          setChat("");
          void act(() => api.chat(lobby.id, body));
        }}
      >
        <input value={chat} onChange={(e) => setChat(e.target.value)} maxLength={200} placeholder="Say hi" aria-label="Message" data-testid="chat-input" />
        <button type="submit" className={app.ghost}>Send</button>
      </form>
    </section>
  );

  const header = (
    <section className={app.stackSm}>
      <p className={app.label}>
        {gameName(lobby.game)} · {lobby.targets.map((l) => `${flagEmoji(langFlag(l))} ${langName(l)}`).join(", ")}
      </p>
      <p className={styles.code} data-testid="room-code">{lobby.code}</p>
    </section>
  );

  if (phase.kind === "waiting") {
    const readyCount = lobby.players.filter((p) => p.ready).length;
    const startsIn = lobby.nextStartAt ? Math.max(0, Math.ceil((Date.parse(lobby.nextStartAt) - now - offset) / 1000)) : null;
    return (
      <div className={app.stack} data-testid="room">
        {header}
        {toolbar}
        <div className={app.row}>
          <button type="button" className={app.ghost} onClick={() => void share()}>{copied ? "Link copied" : "Share link"}</button>
          <button type="button" className={app.link} onClick={() => void leave()}>Leave</button>
        </div>
        <div className={styles.split}>
          <section className={app.stackSm}>
            {scoreboard}
            <div className={app.row}>
              <button type="button" className={me?.ready ? app.ghost : app.cta} onClick={() => void act(() => api.ready(lobby.id, !me?.ready))} data-testid="ready">
                {me?.ready ? "Not ready" : "Ready"}
              </button>
              {lobby.isHost && lobby.botsEnabled && !lobby.botFill ? (
                <button type="button" className={app.ghost} onClick={() => void act(() => api.fillBots(lobby.id))} data-testid="fill-bots">
                  Fill with bots
                </button>
              ) : null}
              {lobby.isHost ? (
                <button type="button" className={app.cta} disabled={readyCount < 2} onClick={() => void act(() => api.start(lobby.id))} data-testid="start">
                  Start game
                </button>
              ) : null}
            </div>
            <p className={app.small}>{lobby.standing ? (startsIn === null ? "The next game starts soon." : `Next game starts in ${startsIn}s.`) : lobby.isHost ? (readyCount < 2 ? "Two players need to be ready to start." : "Everyone ready? Start the game.") : "The host starts when two players are ready."}</p>
          </section>
          {chatBox}
        </div>
        {error ? <p className={app.error} role="alert">{error}</p> : null}
      </div>
    );
  }

  if (phase.kind === "countdown") {
    return (
      <div className={app.stack} data-testid="room">
        {header}
        <p className={styles.promptWord} data-testid="countdown">{Math.ceil(phase.seconds)}</p>
      </div>
    );
  }

  if (phase.kind === "round") {
    const prompt = promptFor(lobby, phase.index);
    const previous = promptFor(lobby, phase.index - 1);
    const mine = picked?.round === phase.index && picked.game === lobby.startedAt ? picked : null;
    const done = !!mine || answeredRound(lobby, phase.index);
    const elapsed = lobby.roundSeconds * 1000 - phase.remaining * 1000;
    const lives = lobby.game === "tiles" ? livesLeft(lobby, phase.index) : null;
    return (
      <div className={app.stack} data-testid="room">
        {toolbar}
        <p className={app.label}>
          Round {phase.index + 1} of {lobby.rounds} · <span className={styles.scoreNow} key={myScore(lobby)}>{myScore(lobby)}</span> points
          {lives !== null ? <span className={styles.lives} data-testid="lives"> {"♥".repeat(lives)}{"♡".repeat(Math.max(0, 3 - lives))}</span> : null}
        </p>
        {mine && !mine.pending && mine.points > 0 ? <p className={styles.pop} key={`${mine.game}:${mine.round}`} data-testid="score-pop">+{mine.points}</p> : null}
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
            {lives === 0 ? <p className={styles.feedback}>Out of lives. Watch the rest.</p> : null}
          </>
        ) : prompt ? (
          <>
            <div className={styles.prompt}>
              <p className={app.small}>{prompt.mode === "flag" ? "Which language is this word?" : "Pick the word that means"}</p>
              <p className={styles.promptWord} data-testid="prompt">{prompt.gloss}</p>
            </div>
            <ul className={styles.choices}>
              {prompt.choices.map((c) => (
                <li key={c}>
                  <button type="button" className={styles.choice} data-state={mine ? (mine.choice === c ? (mine.pending ? "pending" : mine.correct ? "right" : "wrong") : "dim") : done ? "dim" : undefined} disabled={done} onClick={() => void answer(phase.index, c)} data-testid="choice">
                    {prompt.mode === "flag" ? langName(c) : c}
                  </button>
                </li>
              ))}
            </ul>
            {mine ? <p className={styles.feedback} data-testid="feedback" aria-busy={mine.pending}>{mine.pending ? "Checking" : mine.points > 0 ? `Right. +${mine.points}` : mine.correct ? "Right." : "Not this time."}</p> : null}
          </>
        ) : (
          <p className={app.muted} aria-busy="true">Loading the round</p>
        )}
        {previous?.reveal?.length ? <Reveal prompt={previous} compact /> : null}
        {done ? (
          <>
            {lobby.game === "live" || lobby.game === "tiles" ? scoreboard : null}
            <Ad placement="between-rounds" />
          </>
        ) : null}
        {error ? <p className={app.error} role="alert">{error}</p> : null}
      </div>
    );
  }

  const missed = missedWords(lobby).filter((w) => !w.includes(","));
  const startsIn = lobby.nextStartAt ? Math.max(0, Math.ceil((Date.parse(lobby.nextStartAt) - now - offset) / 1000)) : null;
  const guest = state.identity.kind === "guest";
  return (
    <div className={app.stack} data-testid="results">
      <section className={app.stackSm}>
        <p className={app.label}>Game over</p>
        <h1 className={app.title}>{board[0]?.isMe ? "🏆 You won" : `${board[0]?.name ?? "Nobody"} wins`}</h1>
      </section>
      {toolbar}
      {scoreboard}
      <section className={styles.nextBar} data-testid="next-ctas">
        {lobby.standing ? (
          <span className={styles.nextName} data-testid="next-game">Next game: {lobby.name}{startsIn !== null ? ` in ${startsIn}s` : " in a few seconds"}</span>
        ) : next ? (
          <a className={app.cta} href={`/play/${next.code}`} data-testid="next-game">Next game: {next.name}</a>
        ) : null}
        <button type="button" className={app.ghost} disabled={busy} onClick={() => void newLobby(false)} data-testid="rematch">Rematch</button>
        <button type="button" className={app.ghost} disabled={busy} onClick={() => void newLobby(true)} data-testid="play-bots">Play with bots</button>
        <a className={app.cta} href={LEARN_HREF} data-testid="results-learn">Start learning</a>
      </section>
      <section className={app.stackSm} data-testid="reveal-all">
        <h2 className={app.fieldLabel}>Every word in this game</h2>
        {lobby.prompts.map((p) => (p.reveal?.length ? <Reveal key={p.round} prompt={p} /> : null))}
      </section>
      {guest ? (
        <section className={styles.upsell} data-testid="save-progress">
          <b>Save your progress</b>
          <p className={app.small}>You scored {myScore(lobby)} points. Sign in to keep your streak, stats and game history. Your guest games come with you.</p>
          <a className={app.cta} href="/app?next=/play">Save my progress</a>
        </section>
      ) : null}
      <section className={styles.upsell} data-testid="learn-upsell">
        <b>Learn the words you missed</b>
        {lobby.status !== "done" && !tallyLate(lobby, now + offset) ? (
          <p className={app.small} aria-busy="true" data-testid="missed-loading">Counting your answers</p>
        ) : lobby.status !== "done" ? (
          <p className={app.small} data-testid="missed-late">Your answers are saved. Lessons cover every word in this game.</p>
        ) : missed.length ? (
          <ul className={styles.missed}>
            {missed.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : (
          <p className={app.small}>A clean sweep. Lessons take you further.</p>
        )}
        <p className={app.small}>Lessons and courses come with a Polingual subscription.</p>
        <a className={app.ghost} href={LEARN_HREF}>See lessons</a>
      </section>
      <Ad placement="results" />
      <div className={app.row}>
        <a className={app.ghost} href="/play">Back to lobbies</a>
      </div>
    </div>
  );
}

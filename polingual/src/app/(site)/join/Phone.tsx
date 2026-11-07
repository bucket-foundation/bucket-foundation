"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { clockOffset, displayNickname, joinError, normalizeCode, rank, secondsLeft, type Snapshot } from "@/lib/stoa/client";
import { nicknameChoices } from "@/lib/stoa/nicknames";
import { LiveSocket, type SocketStatus } from "@/lib/stoa/socket";
import { verifyEvent } from "@/lib/stoa/verify";
import { Brand, Prompt, Standings, Tiles, type TileState } from "../live/parts";
import styles from "../live/stoa.module.css";

const KEY = "stoa/player/v1";
const APP_URL = "https://apps.apple.com/app/id6825177856";

type Seat = { room_id: string; player_id: string; token: string };

export function announce(left: number | null, paused: boolean): string {
  if (paused) return "Paused.";
  if (left === 10) return "10 seconds left.";
  if (left === 5) return "5 seconds left.";
  if (left === 0) return "Time is up.";
  return "";
}

function loadSeat(): Seat | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Seat) : null;
  } catch {
    return null;
  }
}

function saveSeat(s: Seat | null): void {
  try {
    if (s) sessionStorage.setItem(KEY, JSON.stringify(s));
    else sessionStorage.removeItem(KEY);
  } catch {
  }
}

export default function Phone({ initialCode }: { initialCode?: string }) {
  const [seat, setSeat] = useState<Seat | null>(null);
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState(normalizeCode(initialCode ?? ""));
  const [names, setNames] = useState<string[]>([]);
  const [step, setStep] = useState<"code" | "name">(initialCode && normalizeCode(initialCode).length === 6 ? "name" : "code");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<SocketStatus>("connecting");
  const [verified, setVerified] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const seq = useRef(0);
  const offset = useRef(0);
  const socket = useRef<LiveSocket | null>(null);
  const samples = useRef<{ sent_at: number; received_at: number }[]>([]);
  const lastFail = useRef(0);
  const seatRef = useRef<Seat | null>(null);

  useEffect(() => {
    setNames(nicknameChoices(Math.random));
    const s = loadSeat();
    if (s) {
      seatRef.current = s;
      setSeat(s);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const leave = useCallback((message?: string) => {
    socket.current?.stop();
    socket.current = null;
    saveSeat(null);
    seatRef.current = null;
    setSeat(null);
    setSnap(null);
    setStep("code");
    if (message) setError(message);
  }, []);

  const fetchState = useCallback(async () => {
    const s = seatRef.current;
    if (!s) return;
    const sent = Date.now();
    let r: Response;
    try {
      r = await fetch(`/api/live/rooms/${s.room_id}/state`, { headers: { authorization: `Bearer ${s.token}` }, cache: "no-store" });
    } catch {
      return;
    }
    if (r.status === 401 || r.status === 403 || r.status === 404) return leave(r.status === 403 ? "The host removed you from this room." : "That room has ended.");
    if (!r.ok) return;
    const body = (await r.json()) as Snapshot;
    offset.current = clockOffset(sent, Date.now(), body.server_now);
    if (body.token) {
      const next = { ...s, token: body.token };
      seatRef.current = next;
      saveSeat(next);
      setSeat(next);
    }
    seq.current = Math.max(seq.current, body.room.seq);
    setSnap(body);
    if (!socket.current) {
      socket.current = new LiveSocket(body.realtime, (p) => void onEvent.current(p), setStatus);
      socket.current.start();
    } else socket.current.retarget(body.realtime);
  }, [leave]);

  const report = useCallback(async (extra: Record<string, unknown>) => {
    const s = seatRef.current;
    if (!s) return;
    await fetch("/api/live/probe", { method: "POST", headers: { authorization: `Bearer ${s.token}`, "content-type": "application/json" }, body: JSON.stringify(extra) }).catch(() => undefined);
  }, []);

  const onEvent = useRef<(p: unknown) => Promise<void>>(async () => {});
  onEvent.current = async (payload: unknown) => {
    const s = seatRef.current;
    const key = snap?.room.verify_key;
    if (!s || !key) return;
    const v = await verifyEvent(payload, { roomId: s.room_id, lastSeq: seq.current, publicKey: key, now: Date.now(), clockOffsetMs: offset.current });
    if (!v.ok) {
      if (v.reason !== "seq" && Date.now() - lastFail.current > 15_000) {
        lastFail.current = Date.now();
        void report({ failed: true });
      }
      return;
    }
    const gap = v.seq > seq.current + 1;
    seq.current = v.seq;
    setVerified((n) => n + 1);
    if (v.type === "probe") {
      samples.current.push({ sent_at: v.issuedAt, received_at: Date.now() + offset.current });
      if (samples.current.length === 3) void report({ samples: samples.current });
      return;
    }
    if (v.type === "open" && !gap) {
      const p = v.payload as { idx: number; round: number; kind: "pick_word" | "which_language" | "translate"; prompt: Record<string, string>; options: string[]; opens_at: number; closes_at: number };
      setSnap((prev) =>
        prev
          ? {
              ...prev,
              room: { ...prev.room, phase: "question", idx: p.idx, seq: v.seq, opens_at: p.opens_at, closes_at: p.closes_at, paused: false },
              question: { idx: p.idx, round: p.round, kind: p.kind, prompt: p.prompt, options: p.options, answer: null, counts: null },
              player: prev.player ? { ...prev.player, choice: null } : prev.player,
            }
          : prev,
      );
      return;
    }
    setTimeout(() => void fetchState(), v.type === "rotate" || v.type === "reveal" ? 0 : Math.floor(Math.random() * 800));
  };

  const roomId = seat?.room_id;
  useEffect(() => {
    if (roomId) void fetchState();
  }, [roomId, fetchState]);

  useEffect(() => {
    if (!seat) return;
    const t = setInterval(() => void fetchState(), status === "open" ? 10_000 : 1500);
    return () => clearInterval(t);
  }, [seat, status, fetchState]);

  useEffect(() => () => socket.current?.stop(), []);

  async function join(nickname: string) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/live/join", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code, nickname }) });
      const body = (await r.json()) as { error?: string; room_id: string; player_id: string; token: string };
      if (!r.ok) {
        setError(joinError(body.error));
        if (body.error === "name_taken") setNames(nicknameChoices(Math.random));
        if (body.error === "no_room" || body.error === "code") setStep("code");
        return;
      }
      const s = { room_id: body.room_id, player_id: body.player_id, token: body.token };
      saveSeat(s);
      seatRef.current = s;
      seq.current = 0;
      samples.current = [];
      setSeat(s);
    } catch {
      setError(joinError("offline"));
    } finally {
      setBusy(false);
    }
  }

  async function answer(choice: number) {
    const s = seatRef.current;
    const q = snap?.question;
    if (!s || !q || snap?.player?.choice != null) return;
    setSnap((prev) => (prev && prev.player ? { ...prev, player: { ...prev.player, choice } } : prev));
    const r = await fetch("/api/live/answer", { method: "POST", headers: { authorization: `Bearer ${s.token}`, "content-type": "application/json" }, body: JSON.stringify({ idx: q.idx, choice }) }).catch(() => null);
    if (!r || !r.ok) {
      const body = r ? ((await r.json().catch(() => ({}))) as { error?: string }) : {};
      if (body.error === "duplicate") return;
      setError(body.error === "late" ? "Time ran out before your answer arrived." : "Your answer did not reach the room.");
      if (body.error === "stale_token") void fetchState();
    }
  }

  function submitCode(e: FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return setError(joinError("code"));
    setError(null);
    setStep("name");
  }

  const body = (() => {
    if (!ready) return null;
    if (!seat) {
      if (step === "code")
        return (
          <form className={styles.card} onSubmit={submitCode} data-testid="join-code">
            <p className={styles.label}>Join a live room</p>
            <h1 className={styles.title}>Enter the room code</h1>
            <label className={styles.field}>
              <span>Code on the board</span>
              <input className={styles.codeInput} value={code} onChange={(e) => setCode(normalizeCode(e.target.value))} inputMode="text" autoCapitalize="characters" autoComplete="off" maxLength={6} size={6} data-testid="code-input" aria-describedby="code-help" />
            </label>
            <p id="code-help" className={styles.muted}>6 letters and numbers.</p>
            <button type="submit" className={styles.cta} disabled={code.length !== 6}>Next</button>
          </form>
        );
      return (
        <section className={styles.card} data-testid="join-name">
          <p className={styles.label}>Room {code}</p>
          <h1 className={styles.title}>Pick your name</h1>
          <ul className={styles.chips}>
            {names.map((n) => (
              <li key={n}>
                <button type="button" className={styles.pick} disabled={busy} onClick={() => void join(n)} data-testid="nickname">{displayNickname(n)}</button>
              </li>
            ))}
          </ul>
          <div className={styles.row}>
            <button type="button" className={styles.ghost} onClick={() => setNames(nicknameChoices(Math.random))}>Other names</button>
            <button type="button" className={styles.ghost} onClick={() => setStep("code")}>Change code</button>
          </div>
        </section>
      );
    }
    if (!snap) return <p className={styles.muted}>Connecting to the room.</p>;
    const me = snap.player;
    const q = snap.question;
    const phase = snap.room.phase;
    const name = me ? displayNickname(me.nickname) : "";
    if (phase === "lobby")
      return (
        <section className={styles.card} data-testid="phone-lobby">
          <p className={styles.label}>You are in</p>
          <p className={styles.big}>{name}</p>
          <p className={styles.body}>Watch the board. The first question opens when the host starts.</p>
        </section>
      );
    if (phase === "question" && q) {
      const chosen = me?.choice ?? null;
      const left = snap.room.paused ? null : secondsLeft(snap.room.closes_at, now, offset.current, snap.room.opens_at);
      const states: TileState[] = [0, 1, 2, 3].map((i) => (chosen === null ? "idle" : i === chosen ? "chosen" : "dim"));
      return (
        <>
          <div className={styles.spread}>
            <span className={styles.stat}>Question {q.idx + 1} of {snap.room.total}</span>
            <span className={styles.timer} aria-hidden="true">{snap.room.paused ? "Paused" : left}</span>
          </div>
          <p className={styles.sr} aria-live="polite" data-testid="timer-announce">{announce(left, snap.room.paused)}</p>
          <Prompt q={q} />
          <Tiles q={q} states={states} onPick={(i) => void answer(i)} disabled={chosen !== null || snap.room.paused || left === 0} />
          {chosen !== null ? <p className={styles.banner} data-testid="locked">Locked in. Watch the board.</p> : null}
        </>
      );
    }
    if ((phase === "reveal" || phase === "board") && q) {
      const right = me?.choice != null && me.choice === q.answer;
      const states: TileState[] = [0, 1, 2, 3].map((i) => (i === q.answer ? "right" : "dim"));
      const r = rank(snap.standings, me?.id);
      return (
        <>
          <p className={styles.banner} data-tone={right ? "right" : "wrong"} data-testid="result">
            {me?.choice == null ? "No answer this time." : right ? "Right." : "Not this one."} {me?.points ?? 0} points{r ? `, place ${r}` : ""}.
          </p>
          {phase === "board" ? <Standings rows={snap.standings} me={me?.id} /> : <Tiles q={q} states={states} />}
        </>
      );
    }
    if (phase === "finale" || phase === "closed")
      return (
        <section className={styles.card} data-testid="phone-finale">
          <p className={styles.label}>Final board</p>
          <p className={styles.big}>{me?.points ?? 0} points</p>
          <Standings rows={snap.standings.slice(0, 5)} me={me?.id} />
          {!snap.room.school_mode ? (
            <a className={styles.ghost} href={APP_URL} data-testid="app-link">Keep learning with Polingual</a>
          ) : null}
        </section>
      );
    return <p className={styles.muted}>Waiting for the board.</p>;
  })();

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <Brand link={false} />
        {seat ? <span className={styles.stat} data-testid="phone-status" data-socket={status} data-verified={verified}>{status === "open" ? "Live" : "Reconnecting"}</span> : null}
      </header>
      <main className={`${styles.main} ${styles.phone}`} data-testid="phone">
        {body}
        {error ? <p role="alert" className={styles.error} data-testid="phone-error">{error}</p> : null}
      </main>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { clockOffset, displayNickname, joinError, normalizeCode, rank, secondsLeft, type Snapshot } from "@/lib/stoa/client";
import { nicknameChoices } from "@/lib/stoa/nicknames";
import { Avatar } from "@/ui/avatar";
import { dropSeat, findSeat, keepSeat, seatStore, type Seat } from "@/lib/stoa/seat";
import { LiveSocket, type SocketStatus } from "@/lib/stoa/socket";
import { verifyEvent } from "@/lib/stoa/verify";
import { countdownSfx, phoneCue } from "@/lib/stoa/script";
import { buzz } from "@/lib/stoa/stage";
import { MARKS } from "@/lib/stoa/client";
import { Brand, Glyph, Prompt, Standings, TeamStandings, TeamTag, Tiles, type TileState } from "../live/parts";
import { Confetti, MixBar, TimerRing, useStage } from "../live/show";
import styles from "../live/stoa.module.css";
import { Button, ButtonLink, Card, Pill } from "@/ui";

const APP_URL = "https://apps.apple.com/app/id6825177856";

export function announce(left: number | null, paused: boolean): string {
  if (paused) return "Paused.";
  if (left === 10) return "10 seconds left.";
  if (left === 5) return "5 seconds left.";
  if (left === 0) return "Time is up.";
  return "";
}

function saveSeat(s: Omit<Seat, "exp">): Seat {
  return keepSeat(seatStore(), s, Date.now());
}

export default function Phone({ initialCode }: { initialCode?: string }) {
  const [seat, setSeat] = useState<Seat | null>(null);
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState(normalizeCode(initialCode ?? ""));
  const [names, setNames] = useState<string[]>([]);
  const [back, setBack] = useState<Seat | null>(null);
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
  const alive = useRef(true);
  const { stage, mix, setMix, ready: soundReady, unlock } = useStage({ music: false, voice: false, sfx: true });
  const prevSnap = useRef<Snapshot | null>(null);
  const lastLeft = useRef<number | null>(null);

  useEffect(() => {
    if (!snap) {
      prevSnap.current = null;
      return;
    }
    const cue = phoneCue(prevSnap.current, snap);
    for (const f of cue.sfx ?? []) {
      stage.sfx(f);
      if (f === "right" || f === "streak") buzz([40, 60, 40]);
      if (f === "wrong") buzz(180);
      if (f === "open") buzz(25);
    }
    prevSnap.current = snap;
  }, [snap, stage]);

  useEffect(() => {
    if (!snap || snap.room.phase !== "question" || snap.room.paused || snap.player?.choice != null) {
      lastLeft.current = null;
      return;
    }
    const left = secondsLeft(snap.room.closes_at, now, offset.current, snap.room.opens_at);
    const f = countdownSfx(left, lastLeft.current);
    if (f) stage.sfx(f);
    lastLeft.current = left;
  }, [snap, now, stage]);

  useEffect(() => {
    setNames(nicknameChoices(Math.random));
    setBack(initialCode ? findSeat(seatStore(), normalizeCode(initialCode), Date.now()) : null);
    setReady(true);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const leave = useCallback((message?: string) => {
    socket.current?.stop();
    socket.current = null;
    if (seatRef.current) dropSeat(seatStore(), seatRef.current.room_id, Date.now());
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
    if (!alive.current) return;
    if (r.status === 401 || r.status === 403 || r.status === 404) return leave(r.status === 403 ? "The host removed you from this room." : "That room has ended.");
    if (!r.ok) return;
    const body = (await r.json()) as Snapshot;
    if (!alive.current || seatRef.current?.room_id !== s.room_id) return;
    offset.current = clockOffset(sent, Date.now(), body.server_now);
    if (body.token) {
      const next = saveSeat({ ...s, token: body.token });
      seatRef.current = next;
      setSeat(next);
    }
    seq.current = Math.max(seq.current, body.room.seq);
    if (body.room.phase === "closed") dropSeat(seatStore(), s.room_id, Date.now());
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

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      socket.current?.stop();
      socket.current = null;
    };
  }, []);

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
      const s = saveSeat({ room_id: body.room_id, player_id: body.player_id, token: body.token, code, nickname });
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
    stage.sfx("lock");
    buzz(30);
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
    setBack(findSeat(seatStore(), code, Date.now()));
    setStep("name");
  }

  function resume(s: Seat) {
    setBack(null);
    seatRef.current = s;
    seq.current = 0;
    samples.current = [];
    setSeat(s);
  }

  function fresh(s: Seat) {
    dropSeat(seatStore(), s.room_id, Date.now());
    setBack(null);
    setStep("name");
  }

  const body = (() => {
    if (!ready) return null;
    if (!seat) {
      if (back && step === "name")
        return (
          <Card as="section" className={styles.card} data-testid="join-back">
            <p className={styles.label}>Room {back.code}</p>
            <h1 className={styles.title}>Welcome back</h1>
            <p className={styles.body}>This phone already has a seat in this room.</p>
            <Button onClick={() => resume(back)} data-testid="continue">
              {back.nickname ? `Continue as ${displayNickname(back.nickname)}` : "Continue with my seat"}
            </Button>
            <Button variant="ghost" size="md" onClick={() => fresh(back)} data-testid="someone-new">Join as someone new</Button>
          </Card>
        );
      if (step === "code")
        return (
          <Card as="form" className={styles.card} onSubmit={submitCode} data-testid="join-code">
            <p className={styles.label}>Join a live room</p>
            <h1 className={styles.title}>Enter the room code</h1>
            <label className={styles.field}>
              <span>Code on the board</span>
              <input className={styles.codeInput} value={code} onChange={(e) => setCode(normalizeCode(e.target.value))} inputMode="text" autoCapitalize="characters" autoComplete="off" maxLength={6} size={6} data-testid="code-input" aria-describedby="code-help" />
            </label>
            <p id="code-help" className={styles.muted}>6 letters and numbers.</p>
            <p className={styles.muted}>No account and no personal details. <a href="/live/student-data" data-testid="student-data-link">How we handle student data</a></p>
            <Button type="submit" disabled={code.length !== 6}>Next</Button>
          </Card>
        );
      return (
        <Card as="section" className={styles.card} data-testid="join-name">
          <p className={styles.label}>Room {code}</p>
          <h1 className={styles.title}>Pick your name</h1>
          <ul className={styles.chips}>
            {names.map((n) => (
              <li key={n}>
                <Pill disabled={busy} onClick={() => void join(n)} data-testid="nickname">{displayNickname(n)}</Pill>
              </li>
            ))}
          </ul>
          <div className={styles.row}>
            <Button variant="ghost" size="md" onClick={() => setNames(nicknameChoices(Math.random))}>Other names</Button>
            <Button variant="ghost" size="md" onClick={() => setStep("code")}>Change code</Button>
          </div>
        </Card>
      );
    }
    if (!snap) return <p className={styles.muted}>Connecting to the room.</p>;
    const me = snap.player;
    const q = snap.question;
    const phase = snap.room.phase;
    const name = me ? displayNickname(me.nickname) : "";
    if (phase === "lobby")
      return (
        <Card as="section" className={styles.card} data-testid="phone-lobby">
          <p className={styles.label}>You are in</p>
          {me ? <Avatar seed={me.nickname} size="xl" bounce label="" /> : null}
          <p className={styles.big}>{name}</p>
          <TeamTag slot={me?.team_slot} />
          <p className={styles.body}>Watch the board. The first question opens when the host starts.</p>
          <p className={styles.fieldLabel}>Warm up your fingers</p>
          <div className={styles.warm} data-testid="warm-up">
            {MARKS.map((m, i) => (
              <button key={m.letter} type="button" data-pigment={m.pigment} aria-label={`Practice tile ${m.letter}`} onClick={() => { stage.note(i); buzz(15); }}>
                <Glyph glyph={m.glyph} />
              </button>
            ))}
          </div>
        </Card>
      );
    if (phase === "question" && q) {
      const chosen = me?.choice ?? null;
      const left = snap.room.paused ? null : secondsLeft(snap.room.closes_at, now, offset.current, snap.room.opens_at);
      const states: TileState[] = [0, 1, 2, 3].map((i) => (chosen === null ? "idle" : i === chosen ? "chosen" : "dim"));
      return (
        <>
          <div className={styles.spread}>
            <span className={styles.stat}>Question {q.idx + 1} of {snap.room.total}</span>
            <TimerRing left={left ?? 0} total={snap.room.opens_at && snap.room.closes_at ? Math.round((snap.room.closes_at - snap.room.opens_at) / 1000) : 20} paused={snap.room.paused} />
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
      const streak = me?.streak ?? 0;
      return (
        <>
          {phase === "reveal" && right ? <Confetti burst={70} /> : null}
          <p className={styles.banner} data-tone={right ? "right" : "wrong"} data-testid="result">
            {me?.choice == null ? "No answer this time." : right ? "Right." : "Not this one."} {me?.points ?? 0} points{r ? `, place ${r}` : ""}.
          </p>
          {right && streak >= 2 ? <p className={styles.streak} data-testid="streak">{streak} in a row</p> : null}
          {phase === "board" && snap.team_standings ? <TeamStandings rows={snap.team_standings} mine={me?.team_slot} /> : null}
          {phase === "board" ? <Standings rows={snap.team_standings ? snap.standings.slice(0, 5) : snap.standings} me={me?.id} /> : <Tiles q={q} states={states} />}
        </>
      );
    }
    if (phase === "finale" || phase === "closed")
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
    return <p className={styles.muted}>Waiting for the board.</p>;
  })();

  return (
    <div className={styles.page} onClick={unlock} onTouchEnd={unlock}>
      <header className={styles.bar}>
        <Brand link={false} />
        {seat ? <MixBar mix={mix} setMix={setMix} ready={soundReady} unlock={unlock} full={false} /> : null}
        {seat ? <span className={styles.stat} data-testid="phone-status" data-socket={status} data-verified={verified}>{status === "open" ? "Live" : "Reconnecting"}</span> : null}
      </header>
      <main className={`${styles.main} ${styles.phone}`} data-testid="phone">
        {body}
        {seat ? (
          <Button variant="ghost" size="md" onClick={() => leave()} data-testid="leave">Leave game</Button>
        ) : null}
        {error ? <p role="alert" className={styles.error} data-testid="phone-error">{error}</p> : null}
      </main>
    </div>
  );
}

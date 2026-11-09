"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { appAuth } from "@/lib/app/auth";
import { clockOffset, displayNickname, joinUrl, langName, secondsLeft, team, TEAMS, type Snapshot } from "@/lib/stoa/client";
import SignIn from "../app/SignIn";
import { countdownSfx, hostCue, intensity, rankMoves } from "@/lib/stoa/script";
import { Brand, Prompt, Standings, TeamStandings, TeamTag, Tiles, type TileState } from "./parts";
import { Confetti, Drift, MixBar, Podium, TimerRing, useStage } from "./show";
import styles from "./stoa.module.css";

const Qr = dynamic(() => import("./Qr"), { ssr: false });

const KEY = "stoa/host/v1";
const TERMS_KEY = "stoa/host-terms/v1";
const HOST_COPY = {
  label: "Polingual Live",
  title: "Sign in to host a live game",
  intro: "Hosting puts a quiz on your screen. Players join from their phones with a room code and need no account.",
};
const HOMES = ["en", "es", "fr", "de", "pt", "it", "ar", "he", "ja", "zh", "ko", "hi", "ru", "tr"];
const TARGETS = ["es", "fr", "it", "pt", "de", "nl", "sv", "ru", "pl", "el", "ar", "he", "fa", "hi", "ja", "zh", "ko", "th", "tr", "vi", "en", "la"];
const APP_URL = "https://apps.apple.com/app/id6825177856";

type Room = { room_id: string; host_token: string; code: string };
type Auth = "loading" | "signed-out" | "signed-in";

const ERRORS: Record<string, string> = {
  sign_in: "Sign in again to host a room.",
  too_many_rooms: "You already have 3 open rooms. End one first.",
  settings: "Pick at least one language to quiz.",
  no_questions: "No questions fit those languages. Pick another language.",
  offline: "Live rooms are offline right now.",
};

function load(): Room | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Room) : null;
  } catch {
    return null;
  }
}

function save(r: Room | null): void {
  try {
    if (r) sessionStorage.setItem(KEY, JSON.stringify(r));
    else sessionStorage.removeItem(KEY);
  } catch {
  }
}

export default function Host() {
  const [auth, setAuth] = useState<Auth>("loading");
  const [room, setRoom] = useState<Room | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [home, setHome] = useState("en");
  const [targets, setTargets] = useState<string[]>(["es"]);
  const [school, setSchool] = useState(false);
  const [mode, setMode] = useState<"open_floor" | "chorus">("open_floor");
  const [teamCount, setTeamCount] = useState(2);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [origin, setOrigin] = useState("https://polingual.com");
  const offset = useRef(0);
  const { stage, mix, setMix, ready, unlock } = useStage({ music: true, voice: true, sfx: true });
  const prevSnap = useRef<Snapshot | null>(null);
  const lastBoard = useRef<Snapshot["standings"] | null>(null);
  const [moves, setMoves] = useState<Record<string, number>>({});
  const lastLeft = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    setAuth((await appAuth().userId()) ? "signed-in" : "signed-out");
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
    setRoom(load());
    try {
      setTerms(localStorage.getItem(TERMS_KEY) === "1");
    } catch {
      setTerms(false);
    }
    void refresh();
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [refresh]);

  const poll = useCallback(async () => {
    if (!room) return;
    const sent = Date.now();
    const r = await fetch(`/api/live/rooms/${room.room_id}/state`, { headers: { authorization: `Bearer ${room.host_token}` }, cache: "no-store" }).catch(() => null);
    if (!r) return;
    if (r.status === 401 || r.status === 403 || r.status === 404) {
      save(null);
      setRoom(null);
      setSnap(null);
      return;
    }
    if (!r.ok) return;
    const body = (await r.json()) as Snapshot;
    offset.current = clockOffset(sent, Date.now(), body.server_now);
    setSnap(body);
  }, [room]);

  useEffect(() => {
    if (!room) return;
    void poll();
    const t = setInterval(() => void poll(), 1000);
    return () => clearInterval(t);
  }, [room, poll]);

  useEffect(() => {
    if (!snap) {
      prevSnap.current = null;
      stage.play("silent");
      return;
    }
    const prev = prevSnap.current;
    const cue = hostCue(prev, snap);
    if (cue.track) stage.play(cue.track);
    stage.setLayers(intensity(snap.room.players));
    for (const f of cue.sfx ?? []) stage.sfx(f);
    if (cue.say?.length) stage.say(cue.say);
    if (snap.room.phase === "board" && prev?.room.phase !== "board") {
      setMoves(rankMoves(lastBoard.current, snap.standings));
      lastBoard.current = snap.standings;
    }
    prevSnap.current = snap;
  }, [snap, stage]);

  useEffect(() => {
    if (!snap || snap.room.phase !== "question" || snap.room.paused) {
      stage.setUrgent(false);
      lastLeft.current = null;
      return;
    }
    const left = secondsLeft(snap.room.closes_at, now, offset.current, snap.room.opens_at);
    const f = countdownSfx(left, lastLeft.current);
    if (f) stage.sfx(f);
    stage.setUrgent(left > 0 && left <= 5);
    lastLeft.current = left;
  }, [snap, now, stage]);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const token = await appAuth().mobile.accessToken();
      const r = await fetch("/api/live/rooms", {
        method: "POST",
        headers: { authorization: `Bearer ${token ?? ""}`, "content-type": "application/json" },
        body: JSON.stringify({ product: "polingual", settings: { home, targets }, school_mode: school, mode, ...(mode === "chorus" ? { teams: teamCount } : {}) }),
      });
      const body = (await r.json()) as { error?: string; room_id: string; host_token: string; code: string };
      if (!r.ok) {
        setError(ERRORS[body.error ?? ""] ?? "The room did not open. Try again.");
        if (r.status === 401) void refresh();
        return;
      }
      const next = { room_id: body.room_id, host_token: body.host_token, code: body.code };
      save(next);
      setRoom(next);
    } catch {
      setError(ERRORS.offline);
    } finally {
      setBusy(false);
    }
  }

  async function act(action: string, player?: string, body: Record<string, unknown> = {}) {
    if (!room) return;
    const path = player ? `players/${player}/${action}` : action;
    await fetch(`/api/live/rooms/${room.room_id}/${path}`, { method: "POST", headers: { authorization: `Bearer ${room.host_token}`, "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    void poll();
  }

  async function download() {
    if (!room) return;
    const r = await fetch(`/api/live/rooms/${room.room_id}/summary`, { headers: { authorization: `Bearer ${room.host_token}` }, cache: "no-store" }).catch(() => null);
    if (!r || !r.ok) return setError("The results did not download. Try again.");
    const url = URL.createObjectURL(await r.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = `stoa-${room.code}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function newRoom() {
    save(null);
    setRoom(null);
    setSnap(null);
  }

  function acceptTerms(on: boolean) {
    setTerms(on);
    try {
      if (on) localStorage.setItem(TERMS_KEY, "1");
      else localStorage.removeItem(TERMS_KEY);
    } catch {
      return;
    }
  }

  function toggleTarget(t: string) {
    setTargets((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : cur.length >= 12 ? cur : [...cur, t]));
  }

  const view = (() => {
    if (auth === "loading") return null;
    if (auth === "signed-out") return <SignIn onSignedIn={() => void refresh()} copy={HOST_COPY} />;
    if (!room)
      return (
        <section className={styles.card} data-testid="host-setup">
          <p className={styles.label}>Host a live room</p>
          <h1 className={styles.title}>Open a room for your class</h1>
          <p className={styles.body}>Players join on their phones with a code. Three rounds of five questions, 20 seconds each.</p>
          <label className={styles.field}>
            <span>Prompts in</span>
            <select value={home} onChange={(e) => { setHome(e.target.value); setTargets((cur) => cur.filter((t) => t !== e.target.value)); }} data-testid="home">
              {HOMES.map((h) => <option key={h} value={h}>{langName(h)}</option>)}
            </select>
          </label>
          <p className={styles.fieldLabel}>Languages to quiz</p>
          <ul className={styles.chips}>
            {TARGETS.filter((t) => t !== home).map((t) => (
              <li key={t}>
                <button type="button" className={styles.pick} aria-pressed={targets.includes(t)} onClick={() => toggleTarget(t)} data-testid={`target-${t}`}>{langName(t)}</button>
              </li>
            ))}
          </ul>
          <p className={styles.fieldLabel}>Mode</p>
          <ul className={styles.chips}>
            <li>
              <button type="button" className={styles.pick} aria-pressed={mode === "open_floor"} onClick={() => setMode("open_floor")} data-testid="mode-open">Open Floor: every player for themselves</button>
            </li>
            <li>
              <button type="button" className={styles.pick} aria-pressed={mode === "chorus"} onClick={() => setMode("chorus")} data-testid="mode-chorus">Chorus: teams</button>
            </li>
          </ul>
          {mode === "chorus" ? (
            <label className={styles.field}>
              <span>Teams</span>
              <select value={teamCount} onChange={(e) => setTeamCount(Number(e.target.value))} data-testid="team-count">
                {[2, 3, 4].map((n) => <option key={n} value={n}>{n} teams: {TEAMS.slice(0, n).map((t) => t.name).join(", ")}</option>)}
              </select>
            </label>
          ) : null}
          <label className={styles.toggle}>
            <input type="checkbox" checked={school} onChange={(e) => setSchool(e.target.checked)} data-testid="school-mode" />
            <span>School mode: no app links or promotions on any screen</span>
          </label>
          <label className={styles.toggle}>
            <input type="checkbox" checked={terms} onChange={(e) => acceptTerms(e.target.checked)} data-testid="host-terms" />
            <span>
              I accept the <a href="/live/terms">host terms</a>. Players&rsquo; data is covered on the <a href="/live/student-data">student data page</a>.
            </span>
          </label>
          <button type="button" className={styles.cta} disabled={busy || targets.length === 0 || !terms} onClick={() => void create()} data-testid="create-room">
            {busy ? "Opening" : "Open the room"}
          </button>
        </section>
      );
    if (!snap) return <p className={styles.muted}>Opening the room.</p>;
    const phase = snap.room.phase;
    const q = snap.question;
    const url = joinUrl(origin, room.code);
    const teams = snap.room.mode === "chorus" ? snap.room.teams ?? 2 : 0;
    const chip = (p: { id: string; nickname: string; team_slot?: number | null }) => (
      <li key={p.id} className={styles.player}>
        {displayNickname(p.nickname)}
        {teams ? (
          <button type="button" className={styles.remove} aria-label={`Move ${displayNickname(p.nickname)} to Team ${team(((p.team_slot ?? 0) + 1) % teams)?.name}`} onClick={() => void act("move", p.id, { team: ((p.team_slot ?? 0) + 1) % teams })} data-testid="move">⇄</button>
        ) : null}
        <button type="button" className={styles.remove} aria-label={`Remove ${displayNickname(p.nickname)}`} onClick={() => void act("remove", p.id)}>×</button>
      </li>
    );
    const roster = snap.roster ?? [];
    const controls = (
      <div className={styles.controls} data-testid="host-controls">
        {phase === "lobby" ? (
          <>
            <button type="button" className={styles.cta} onClick={() => void act("start")} disabled={snap.room.players === 0} data-testid="start">Start</button>
            <button type="button" className={styles.ghost} aria-pressed={snap.room.locked} onClick={() => void act(snap.room.locked ? "unlock" : "lock")} data-testid="lock">
              {snap.room.locked ? "Room locked" : "Lock room"}
            </button>
          </>
        ) : null}
        {phase === "question" || phase === "reveal" || phase === "board" ? (
          <>
            <button type="button" className={styles.ghost} onClick={() => void act(snap.room.paused ? "resume" : "pause")} data-testid="pause">{snap.room.paused ? "Resume" : "Pause"}</button>
            <button type="button" className={styles.ghost} onClick={() => void act("skip")} data-testid="skip">Next</button>
          </>
        ) : null}
        {phase !== "closed" ? <button type="button" className={styles.ghost} onClick={() => void act("end")} data-testid="end">End room</button> : null}
        {phase === "closed" || phase === "finale" ? (
          <>
            <button type="button" className={styles.ghost} onClick={() => void download()} data-testid="download">Download results</button>
            <button type="button" className={styles.ghost} onClick={newRoom} data-testid="new-room">New room</button>
          </>
        ) : null}
      </div>
    );
    if (phase === "lobby")
      return (
        <section className={styles.board} data-testid="board-lobby">
          <Drift />
          <div className={styles.lobby}>
            <div className={styles.board}>
              <p className={styles.label}>Join at {origin.replace(/^https?:\/\//, "")}/join</p>
              <p className={styles.code} data-testid="room-code">{room.code}</p>
              <p className={styles.stat} data-testid="player-count">{snap.room.players} {snap.room.players === 1 ? "player" : "players"}</p>
              {teams ? (
                <div className={styles.teams} data-testid="team-lobby">
                  {TEAMS.slice(0, teams).map((t) => (
                    <div key={t.slot} className={styles.teamCol}>
                      <TeamTag slot={t.slot} />
                      <ul className={styles.roster} data-testid={`roster-${t.slot}`}>{roster.filter((p) => (p.team_slot ?? 0) === t.slot).map(chip)}</ul>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className={styles.roster} data-testid="roster">{roster.map(chip)}</ul>
              )}
            </div>
            <Qr text={url} />
          </div>
          {controls}
        </section>
      );
    if ((phase === "question" || phase === "reveal") && q) {
      const reveal = phase === "reveal";
      const states: TileState[] = [0, 1, 2, 3].map((i) => (reveal ? (i === q.answer ? "right" : "dim") : "idle"));
      const total = snap.room.opens_at && snap.room.closes_at ? Math.round((snap.room.closes_at - snap.room.opens_at) / 1000) : 20;
      const left = secondsLeft(snap.room.closes_at, now, offset.current, snap.room.opens_at);
      const share = snap.room.players ? Math.min(100, Math.round(((snap.answered ?? 0) / snap.room.players) * 100)) : 0;
      return (
        <section className={styles.board} data-testid={`board-${phase}`}>
          <div className={styles.spread}>
            <span className={styles.stat}>Round {q.round} · Question {q.idx + 1} of {snap.room.total}</span>
            <span className={styles.stat} data-testid="answered">{snap.answered ?? 0} of {snap.room.players} answered</span>
            {reveal ? null : <TimerRing left={left} total={total} paused={snap.room.paused} />}
          </div>
          {!reveal ? <div className={styles.answeredBar} aria-hidden="true"><span style={{ width: `${share}%` }} /></div> : null}
          <Prompt q={q} />
          <Tiles q={q} grid states={states} counts={reveal ? q.counts : null} />
          {controls}
        </section>
      );
    }
    if (phase === "board")
      return (
        <section className={styles.board} data-testid="board-standings">
          <h2 className={styles.title}>Round {q?.round ?? ""} standings</h2>
          {snap.team_standings ? <TeamStandings rows={snap.team_standings} /> : null}
          <Standings rows={snap.team_standings ? snap.standings.slice(0, 5) : snap.standings} moves={moves} />
          {controls}
        </section>
      );
    return (
      <section className={styles.board} data-testid="board-finale">
        <Confetti />
        <h2 className={styles.title}>Final board</h2>
        {snap.team_standings ? <TeamStandings rows={snap.team_standings} /> : <Podium rows={snap.standings.slice(0, 3)} />}
        <Standings rows={snap.standings.slice(0, 5)} testId="finale-top" />
        {!snap.room.school_mode ? (
          <p className={styles.body} data-testid="board-promo">Keep learning at home with the Polingual app: {APP_URL.replace("https://", "")}</p>
        ) : null}
        {controls}
      </section>
    );
  })();

  return (
    <div className={styles.page} onClick={unlock} onTouchEnd={unlock} onKeyDown={unlock}>
      <header className={styles.bar}>
        <Brand link={!snap?.room.school_mode} />
        {room && snap?.room.school_mode ? <span className={styles.label}>School mode</span> : null}
        {auth === "signed-in" ? <MixBar mix={mix} setMix={setMix} ready={ready} unlock={unlock} full /> : null}
      </header>
      <main className={styles.main} data-testid="host">
        {view}
        {error ? <p role="alert" className={styles.error} data-testid="host-error">{error}</p> : null}
      </main>
    </div>
  );
}

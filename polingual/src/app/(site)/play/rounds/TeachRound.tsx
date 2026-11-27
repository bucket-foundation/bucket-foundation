"use client";

import { useEffect, useRef, useState } from "react";
import { currentCard } from "@/lib/family/session";
import { fetchTeach, teachAct, teachError, tvPlayable, type TeachView } from "@/lib/family/rounds";
import { Badge, Button, Card, Pill, ReadAloud, SectionHeading } from "@/ui";
import { langName } from "../langs";
import type { RoundModule, RoundProps } from "./types";
import { usePoll } from "./usePoll";
import s from "./rounds.module.css";

const CLIP_MS = 6000;
const bound = () => fetch.bind(globalThis);

function blobUrl(b: Blob): Promise<string> {
  return new Promise((ok, bad) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => bad(r.error);
    r.readAsDataURL(b);
  });
}

function Recorder({ onClip }: { onClip: (clip: string) => void }) {
  const [state, setState] = useState<"idle" | "rec" | "denied">("idle");
  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const parts: Blob[] = [];
      rec.ondataavailable = (e) => parts.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setState("idle");
        void blobUrl(new Blob(parts, { type: rec.mimeType.split(";")[0] })).then(onClip);
      };
      rec.start();
      setState("rec");
      setTimeout(() => rec.state === "recording" && rec.stop(), CLIP_MS);
    } catch {
      setState("denied");
    }
  };
  if (state === "denied") return <p className={s.error} role="alert">The microphone is off. Allow it in the browser settings to record.</p>;
  return <Button variant="primary" size="lg" disabled={state === "rec"} onClick={() => void start()} data-testid="teach-record">{state === "rec" ? "Recording, six seconds" : "Record one word"}</Button>;
}

function SpeakerPanel({ view, act }: { view: TeachView; act: (a: "record", extra: Record<string, unknown>) => void }) {
  const card = currentCard();
  const homes = card?.band === "adult" ? card.speaks.filter((x) => x.level === 4).map((x) => x.lang) : [];
  const [lang, setLang] = useState(view.lang ?? homes[0] ?? "");
  const [choices, setChoices] = useState(["", "", ""]);
  const [answer, setAnswer] = useState(0);
  const [clip, setClip] = useState<string | null>(null);
  if (!card || card.band !== "adult") return <p className={s.note} data-testid="teach-not-adult">Recording is for adults. Pass the phone to a grown-up, or let the host pick another speaker.</p>;
  if (!homes.length) return <p className={s.note}>Mark a home language on your player card to teach a word.</p>;
  if (view.status === "asked") return <p className={s.note} data-testid="teach-wait-approve">The host checks on the TV that an adult holds this phone.</p>;
  if (view.status !== "approved") return <p className={s.note}>Your word is in. Watch the TV.</p>;
  const filled = choices.filter((c) => c.trim());
  return (
    <div className={s.round}>
      <div className={s.row}>{homes.map((l) => <Pill key={l} active={lang === l} onClick={() => setLang(l)}>{langName(l)}</Pill>)}</div>
      <Recorder onClip={setClip} />
      {clip ? <audio controls src={clip} data-testid="teach-preview" /> : null}
      <p className={s.note}>Type what the word means, then two wrong answers. Tap the right one.</p>
      {choices.map((c, i) => (
        <label key={i} className={s.field}>
          <span className={s.status}>{i === answer ? "Right answer" : "Wrong answer"}</span>
          <input value={c} maxLength={40} onChange={(e) => setChoices(choices.map((x, j) => (j === i ? e.target.value : x)))} />
          <Pill size="sm" active={i === answer} onClick={() => setAnswer(i)}>This one is right</Pill>
        </label>
      ))}
      <Button variant="success" size="lg" disabled={!clip || filled.length < 2 || !choices[answer].trim()} onClick={() => act("record", { lang, clip, choices: filled, answer: filled.indexOf(choices[answer]) })} data-testid="teach-send">Send to the TV</Button>
    </div>
  );
}

function Shared({ view, players, act, room, controls }: { view: TeachView | null; players: RoundProps["lobby"]["players"]; controls: boolean; act: (a: "ask" | "approve" | "play" | "reveal" | "skip" | "report", extra?: Record<string, unknown>) => void; room: boolean }) {
  const speaker = players.find((p) => p.userId === view?.speakerId);
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (view?.status === "open" && view.clip && tvPlayable({ licence: "family-room" }, room)) void audio.current?.play().catch(() => undefined);
  }, [view?.status, view?.clip, room]);
  if (!view || ["done", "skipped", "reported"].includes(view.status)) {
    return (
      <div className={s.round}>
        {view?.status === "done" ? <p className={s.prompt}>It meant {view.choices[view.answer ?? 0]}</p> : null}
        {view?.status === "done" && view.teacherAward ? <Badge tone="ochre" size="lg">Teacher award: {speaker?.name ?? "the teacher"}</Badge> : null}
        {controls ? <p className={s.note}>Pick a grown-up who speaks a home language.</p> : null}
        {controls ? <ul className={s.seats}>{players.filter((p) => !p.bot).map((p) => <li key={p.userId}><Pill onClick={() => act("ask", { speakerId: p.userId })} data-testid="teach-ask">{p.name}</Pill></li>)}</ul> : <p className={s.note}>The host picks a teacher.</p>}
      </div>
    );
  }
  return (
    <div className={s.round}>
      <p className={s.status}>Family Teach{view.lang ? `, ${langName(view.lang)}` : ""}</p>
      {view.status === "asked" && controls ? (
        <>
          <p className={s.prompt}>Is an adult holding {speaker?.name ?? "that"}&apos;s phone?</p>
          <p className={s.note} data-testid="teach-vouch">You are the host. Tapping yes means you vouch that this speaker is an adult. Signed-in speakers also need an 18 and over account.</p>
          <div className={s.row}>
            <Button variant="success" size="lg" onClick={() => act("approve")} data-testid="teach-approve">Yes, an adult</Button>
            <Button variant="secondary" size="lg" onClick={() => act("skip")}>Pick someone else</Button>
          </div>
        </>
      ) : null}
      {view.status === "approved" ? <p className={s.prompt}>{speaker?.name ?? "The teacher"} is recording a word</p> : null}
      {view.status === "ready" && controls ? <Button variant="primary" size="xl" onClick={() => act("play")} data-testid="teach-play">Play the word</Button> : null}
      {view.status === "open" ? (
        <>
          <p className={s.prompt}>What does it mean?</p>
          {view.clip ? <audio ref={audio} src={view.clip} controls data-testid="teach-audio" /> : null}
          <ul className={s.choices}>{view.choices.map((c) => <li key={c}><Card pad="sm" className={s.choice}>{c}</Card></li>)}</ul>
          <p className={s.note}>{view.guessed} answered</p>
          {controls ? <Button variant="primary" size="lg" onClick={() => act("reveal")} data-testid="teach-reveal">Show the answer</Button> : null}
        </>
      ) : null}
      {controls ? <div className={s.row}>
        <Button variant="link" size="sm" onClick={() => act("skip")} data-testid="teach-skip">Skip this clip</Button>
        {view.status === "ready" || view.status === "open" ? <Button variant="link" size="sm" onClick={() => act("report")} data-testid="teach-report">Report this clip</Button> : null}
      </div> : null}
    </div>
  );
}

function Guess({ view, act }: { view: TeachView; act: (a: "guess", extra: Record<string, unknown>) => void }) {
  if (view.status !== "open") return <p className={s.note}>{view.status === "done" ? `It meant ${view.choices[view.answer ?? 0]}.` : "Listen to the TV."}</p>;
  return (
    <ul className={s.choices}>
      {view.choices.map((c, i) => (
        <li key={c}><Button variant={view.myGuess === i ? "accent" : "secondary"} block className={s.choice} disabled={view.myGuess !== null} onClick={() => act("guess", { guess: i })} data-testid="teach-guess">{c}</Button></li>
      ))}
    </ul>
  );
}

export function TeachRound({ lobby, token, role }: RoundProps) {
  const { data, refresh } = usePoll(() => (token ? fetchTeach(bound(), token, lobby.id) : Promise.resolve({ ok: false as const, error: "offline" })));
  const [error, setError] = useState<string | null>(null);
  const view = data?.teach ?? null;
  const me = lobby.players.find((p) => p.isMe);
  const act = (action: Parameters<typeof teachAct>[3], extra: Record<string, unknown> = {}) => {
    if (!token) return;
    void teachAct(bound(), token, lobby.id, action, extra).then((r) => {
      setError(r.ok ? null : teachError(r.error));
      refresh();
    });
  };
  const shared = role !== "phone";
  return (
    <section className={s.round} data-role={role} data-testid="teach-round">
      <SectionHeading eyebrow="Round" action={<ReadAloud text="Family Teach. Listen to the word and guess what it means." lang={lobby.root} />}>Family Teach</SectionHeading>
      {shared || lobby.isHost ? <Shared view={view} players={lobby.players} act={act} room controls={lobby.isHost} /> : null}
      {!shared && !lobby.isHost && view && me && view.speakerId === me.userId ? <SpeakerPanel view={view} act={act} /> : null}
      {!shared && !lobby.isHost && view && me && view.speakerId !== me.userId ? <Guess view={view} act={act} /> : null}
      {!shared && !lobby.isHost && !view ? <p className={s.note}>The host picks a teacher.</p> : null}
      {error ? <p className={s.error} role="alert">{error}</p> : null}
    </section>
  );
}

export const FAMILY_TEACH: RoundModule = { id: "family-teach", title: "Family Teach", blurb: "A grown-up records a word from home. Everyone guesses what it means.", Round: TeachRound };

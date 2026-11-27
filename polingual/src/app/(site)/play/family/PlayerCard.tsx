"use client";

import { useEffect, useMemo, useState } from "react";
import { LANGS, langName, type LangItem } from "@academy/lang-systems";
import { loadLangCorpus } from "@academy/lang-client";
import { flagEmoji, langFlag } from "@/lib/lobby/client";
import { nicknameChoices } from "@/lib/stoa/nicknames";
import { displayNickname } from "@/lib/stoa/client";
import { AGE_BANDS, LEVELS, bandFromAnswers, blankCard, cardReady, setLevel, setReads, setSurprise, surprisePick, toggleLearn, toggleSpeak, type PlayerCard as Card } from "@/lib/family/card";
import { lastCard, setCurrentCard } from "@/lib/family/session";
import { kidSeat } from "@/lib/family/kid";
import { Button } from "@/ui";
import f from "./family.module.css";

export const CARD_LANGS = ["en", "es", "fr", "de", "it", "pt", "zh", "ja", "ko", "ar", "hi", "ru", "nl", "pl", "tr", "vi", "he", "el", "sv", "id"];
const LEARN_POOL = CARD_LANGS.filter((l) => l in LANGS);

type Step = "who" | "speak" | "learn" | "check";

function names(): string[] {
  return nicknameChoices(Math.random, 3).map(displayNickname);
}

function Flag({ lang }: { lang: string }) {
  return <span className={f.flag} aria-hidden="true">{flagEmoji(langFlag(lang)) || "🌐"}</span>;
}

export default function PlayerCard({ onJoin }: { onJoin: (nickname: string) => void }) {
  const saved = useMemo(() => lastCard(), []);
  const [step, setStep] = useState<Step | "again">(saved ? "again" : "who");
  const [card, setCard] = useState<Card>(() => blankCard());
  const [choices, setChoices] = useState<string[]>([]);
  useEffect(() => {
    const n = names();
    setChoices(n);
    setCard((c) => ({ ...c, nickname: c.nickname || n[0], band: kidSeat() ? "under13" : c.band }));
  }, []);
  const finish = (c: Card) => {
    const final = { ...c, learn: surprisePick(c, LEARN_POOL, Math.random) };
    setCurrentCard(final);
    onJoin(final.nickname);
  };
  if (step === "again" && saved) {
    return (
      <section className={f.card} data-testid="player-card-again">
        <p className={f.step}>Welcome back</p>
        <h2 className={f.title}>{saved.nickname}</h2>
        <p className={f.muted}>
          Speaks {saved.speaks.map((s) => langName(s.lang)).join(", ")}. Learning {saved.learn.map(langName).join(", ") || "a surprise"}.
        </p>
        <div className={f.nav}>
          <Button size="lg" onClick={() => finish(saved)} data-testid="card-same">Same as last time</Button>
          <Button variant="ghost" size="md" onClick={() => { setCard({ ...saved, nickname: choices[0] ?? saved.nickname }); setStep("who"); }} data-testid="card-change">Change my card</Button>
        </div>
      </section>
    );
  }
  return (
    <section className={f.card} data-testid="player-card">
      {step === "who" ? <Who card={card} setCard={setCard} choices={choices} reroll={() => setChoices(names())} next={() => setStep("speak")} /> : null}
      {step === "speak" ? <Speak card={card} setCard={setCard} back={() => setStep("who")} next={() => setStep("learn")} /> : null}
      {step === "learn" ? <Learn card={card} setCard={setCard} back={() => setStep("speak")} next={() => setStep("check")} /> : null}
      {step === "check" ? <Check card={card} done={(c) => finish(c)} /> : null}
    </section>
  );
}

function Who({ card, setCard, choices, reroll, next }: { card: Card; setCard: (c: Card) => void; choices: string[]; reroll: () => void; next: () => void }) {
  return (
    <>
      <p className={f.step}>Step 1 of 4</p>
      <h2 className={f.title}>Who is playing?</h2>
      {card.band === "under13" && kidSeat() ? null : <div className={f.grid} role="group" aria-label="Age">
        {AGE_BANDS.map((b) => (
          <button key={b.band} type="button" className={f.tap} aria-pressed={card.band === b.band} onClick={() => setCard({ ...card, band: b.band })} data-testid={`band-${b.band}`}>
            {b.label}
          </button>
        ))}
      </div>}
      <div className={f.grid} role="group" aria-label="Nickname">
        {choices.map((n) => (
          <button key={n} type="button" className={f.tap} aria-pressed={card.nickname === n} onClick={() => setCard({ ...card, nickname: n })}>
            {n}
          </button>
        ))}
        <button type="button" className={f.tap} onClick={reroll} data-testid="reroll">🎲 New names</button>
      </div>
      {card.band === "under13" ? <p className={f.muted}>Kids play with a fun name. Nothing about this seat is kept after the room closes.</p> : null}
      <div className={f.nav}>
        <Button size="lg" disabled={card.nickname.length < 2} onClick={next} data-testid="card-next">Next</Button>
      </div>
    </>
  );
}

function Speak({ card, setCard, back, next }: { card: Card; setCard: (c: Card) => void; back: () => void; next: () => void }) {
  return (
    <>
      <p className={f.step}>Step 2 of 4</p>
      <h2 className={f.title}>I speak</h2>
      <div className={f.grid} role="group" aria-label="Languages I speak">
        {CARD_LANGS.map((l) => (
          <button key={l} type="button" className={f.tap} aria-pressed={card.speaks.some((s) => s.lang === l)} onClick={() => setCard(toggleSpeak(card, l))} data-testid={`speak-${l}`}>
            <Flag lang={l} />
            {langName(l)}
          </button>
        ))}
      </div>
      {card.speaks.map((s) => (
        <div key={s.lang} className={f.speakRow}>
          <p className={f.speakName}>{langName(s.lang)}</p>
          <div className={f.faces} role="group" aria-label={`How well you speak ${langName(s.lang)}`}>
            {LEVELS.map((lv) => (
              <button key={lv.level} type="button" className={f.tap} aria-pressed={s.level === lv.level} onClick={() => setCard(setLevel(card, s.lang, lv.level))} data-testid={`level-${s.lang}-${lv.level}`}>
                <span className={f.face} aria-hidden="true">{lv.face}</span>
                <span className={f.small}>{lv.label}</span>
              </button>
            ))}
          </div>
          {s.level === 4 ? (
            <div className={f.faces} role="group" aria-label="Can you read it?">
              <button type="button" className={f.tap} aria-pressed={s.reads !== false} onClick={() => setCard(setReads(card, s.lang, true))}>📖 I can read it</button>
              <button type="button" className={f.tap} aria-pressed={s.reads === false} onClick={() => setCard(setReads(card, s.lang, false))}>👂 Speak only</button>
            </div>
          ) : null}
        </div>
      ))}
      <div className={f.nav}>
        <Button variant="ghost" size="md" onClick={back}>Back</Button>
        <Button size="lg" disabled={!card.speaks.length} onClick={next} data-testid="card-next">Next</Button>
      </div>
    </>
  );
}

function Learn({ card, setCard, back, next }: { card: Card; setCard: (c: Card) => void; back: () => void; next: () => void }) {
  const open = CARD_LANGS.filter((l) => !card.speaks.some((s) => s.lang === l));
  return (
    <>
      <p className={f.step}>Step 3 of 4</p>
      <h2 className={f.title}>I want to learn</h2>
      <p className={f.muted}>Pick up to 3.</p>
      <div className={f.grid} role="group" aria-label="Languages to learn">
        <button type="button" className={`${f.tap} ${f.wide}`} aria-pressed={card.surprise} onClick={() => setCard(setSurprise(card, !card.surprise))} data-testid="learn-surprise">🎁 Surprise me</button>
        {open.map((l) => (
          <button key={l} type="button" className={f.tap} aria-pressed={card.learn.includes(l)} onClick={() => setCard(toggleLearn(card, l))} data-testid={`learn-${l}`}>
            <Flag lang={l} />
            {langName(l)}
          </button>
        ))}
      </div>
      <div className={f.nav}>
        <Button variant="ghost" size="md" onClick={back}>Back</Button>
        <Button size="lg" disabled={!cardReady(card)} onClick={next} data-testid="card-next">Next</Button>
      </div>
    </>
  );
}

const CHECK_TIERS = [1, 5, 8, 10];

function checkItems(items: readonly LangItem[], lang: string, root: string): { form: string; right: string; wrong: string; flip: boolean }[] {
  const pool = items.filter((i) => i.kind === "word" && i.forms[lang] && i.forms[root]);
  return CHECK_TIERS.flatMap((tier, n) => {
    const at = pool.filter((i) => Math.abs(i.tier - tier) <= 1);
    const a = at[Math.floor(Math.random() * at.length)];
    const b = pool.find((i) => i.id !== a?.id && i.forms[root] !== a?.forms[root] && i.category !== a?.category);
    return a && b ? [{ form: a.forms[lang], right: a.forms[root], wrong: b.forms[root], flip: (n + a.id.length) % 2 === 0 }] : [];
  });
}

function Check({ card, done }: { card: Card; done: (c: Card) => void }) {
  const [items, setItems] = useState<LangItem[] | null>(null);
  const [started, setStarted] = useState(false);
  const [at, setAt] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const lang = card.learn[0];
  const root = card.speaks.find((s) => s.lang === "en")?.lang ?? card.speaks[0]?.lang ?? "en";
  useEffect(() => {
    if (!started) return;
    let live = true;
    void loadLangCorpus().then((c) => live && setItems(c?.items ?? []));
    return () => {
      live = false;
    };
  }, [started]);
  const qs = useMemo(() => (items && lang ? checkItems(items, lang, root) : []), [items, lang, root]);
  if (!lang || !started) {
    return (
      <>
        <p className={f.step}>Step 4 of 4</p>
        <h2 className={f.title}>Quick check</h2>
        <p className={f.muted}>{lang ? `Four words in ${langName(lang)} so the game starts at your level. Skip it and the game learns from your answers.` : "The game learns your level from your answers."}</p>
        <div className={f.nav}>
          <Button size="lg" onClick={() => done(card)} data-testid="card-join">Skip and join</Button>
          {lang ? <Button variant="ghost" size="md" onClick={() => setStarted(true)} data-testid="check-start">Take the check</Button> : null}
        </div>
      </>
    );
  }
  if (!items) return <p className={f.muted} aria-busy="true">Loading words</p>;
  const q = qs[at];
  if (!q) {
    const band = bandFromAnswers(answers);
    return (
      <>
        <h2 className={f.title}>Starting at {band}</h2>
        <Button size="lg" onClick={() => done({ ...card, check: { ...card.check, [lang]: band } })} data-testid="card-join">Join the game</Button>
      </>
    );
  }
  const opts = q.flip ? [q.wrong, q.right] : [q.right, q.wrong];
  return (
    <>
      <p className={f.step}>Word {at + 1} of {qs.length}</p>
      <p className={f.big} lang={LANGS[lang]?.bcp47}>{q.form}</p>
      <div className={f.choices}>
        {opts.map((o) => (
          <button key={o} type="button" className={f.choice} onClick={() => { setAnswers([...answers, o === q.right]); setAt(at + 1); }}>
            {o}
          </button>
        ))}
        <button type="button" className={`${f.choice} ${f.wide}`} onClick={() => { setAnswers([...answers, false]); setAt(at + 1); }}>I do not know</button>
      </div>
    </>
  );
}

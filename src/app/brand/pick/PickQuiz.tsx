"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/ui";
import { ASPECTS, ASPECT_IDS, DIRECTIONS, mediaFor, type AspectId, type DirectionId } from "@/lib/brand-pick/directions";
import { answerKey, mergeAnswers, normalizeNote, parseAnswer, NOTE_MAX, type Answer } from "@/lib/brand-pick/answers";
import { nextCard, progress, stable, type Card } from "@/lib/brand-pick/schedule";
import { buildResults, pct, shareSummary } from "@/lib/brand-pick/results";

const STORE = "bucket.brand-pick.v1";
const API = "/api/brand/pick";
const EYEBROW = "small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)]";
const PANEL = "border border-[color:var(--hairline)] rounded-sm bg-[color:var(--bone)]";

interface Stored {
  seed: number;
  answers: Answer[];
}

type Account = "checking" | "guest" | "signed-in" | "signed-in-offline";

function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

function readStore(): Stored | null {
  try {
    const raw = window.localStorage.getItem(STORE);
    if (!raw) return null;
    const v = JSON.parse(raw) as { seed?: unknown; answers?: unknown };
    if (typeof v.seed !== "number" || !Array.isArray(v.answers)) return null;
    return { seed: v.seed, answers: v.answers.map(parseAnswer).filter((x): x is Answer => x !== null) };
  } catch {
    return null;
  }
}

function writeStore(v: Stored | null): void {
  try {
    if (v) window.localStorage.setItem(STORE, JSON.stringify(v));
    else window.localStorage.removeItem(STORE);
  } catch {
  }
}

async function pushAnswers(answers: Answer[]): Promise<boolean> {
  if (answers.length === 0) return true;
  try {
    const res = await fetch(API, { method: "PUT", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers }) });
    return res.ok;
  } catch {
    return false;
  }
}

export default function PickQuiz() {
  const [seed, setSeed] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [account, setAccount] = useState<Account>("checking");
  const [unsynced, setUnsynced] = useState<Answer[]>([]);
  const [note, setNote] = useState("");
  const [view, setView] = useState<"quiz" | "results">("quiz");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const local = readStore() ?? { seed: newSeed(), answers: [] };
    setSeed(local.seed);
    setAnswers(local.answers);
    writeStore(local);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(API, { credentials: "same-origin", cache: "no-store" });
        const body = (await res.json()) as { signedIn?: boolean; clearedAt?: string | null; answers?: unknown[] };
        if (cancelled) return;
        if (!body.signedIn) {
          setAccount("guest");
          return;
        }
        if (!res.ok) {
          setAccount("signed-in-offline");
          setStatus("Your account storage is unavailable. Answers stay on this device.");
          return;
        }
        const remote = (body.answers ?? []).map(parseAnswer).filter((x): x is Answer => x !== null);
        const cleared = body.clearedAt ? new Date(body.clearedAt).toISOString() : "";
        local.answers = local.answers.filter((x) => x.at > cleared);
        const remoteKeys = new Map(remote.map((x) => [answerKey(x), x.at]));
        const toPush = local.answers.filter((x) => (remoteKeys.get(answerKey(x)) ?? "") < x.at);
        const merged = mergeAnswers(remote, local.answers);
        setAnswers(merged);
        writeStore({ seed: local.seed, answers: merged });
        setAccount("signed-in");
        if (!(await pushAnswers(toPush))) {
          setUnsynced(toPush);
          setStatus("Some answers from this device did not reach your account yet.");
        }
      } catch {
        if (!cancelled) setAccount("guest");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const card = useMemo(() => (seed === null ? null : nextCard(seed, answers)), [seed, answers]);
  const prog = useMemo(() => progress(answers, card), [answers, card]);
  const results = useMemo(() => buildResults(answers), [answers]);

  const record = useCallback(
    async (c: Card, choice: DirectionId | null) => {
      if (seed === null) return;
      const answer: Answer = { aspect: c.aspect, a: c.a, b: c.b, round: c.round, left: c.left, choice, note: normalizeNote(note), at: new Date().toISOString() };
      const merged = mergeAnswers(answers, [answer]);
      setAnswers(merged);
      writeStore({ seed, answers: merged });
      setNote("");
      if (account !== "signed-in") return;
      const batch = [...unsynced, answer];
      if (await pushAnswers(batch)) {
        setUnsynced([]);
        setStatus(null);
      } else {
        setUnsynced(batch);
        setStatus(`${batch.length} answer${batch.length === 1 ? "" : "s"} not saved to your account yet. They are on this device and retry with the next pick.`);
      }
    },
    [seed, answers, note, account, unsynced],
  );

  useEffect(() => {
    if (view !== "quiz" || !card) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.isContentEditable)) return;
      if (e.key === "1") void record(card, card.left);
      else if (e.key === "2") void record(card, card.right);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, card, record]);

  const startOver = async () => {
    if (!window.confirm("Clear every answer and start over?")) return;
    if (account === "signed-in") {
      try {
        const res = await fetch(API, { method: "DELETE", credentials: "same-origin" });
        if (!res.ok) {
          setStatus("Your saved answers could not be cleared. Try again.");
          return;
        }
      } catch {
        setStatus("Your saved answers could not be cleared. Try again.");
        return;
      }
    }
    const fresh = { seed: newSeed(), answers: [] };
    writeStore(fresh);
    setSeed(fresh.seed);
    setAnswers([]);
    setUnsynced([]);
    setNote("");
    setStatus(null);
    setView("quiz");
  };

  if (seed === null) return <p className="mt-8 text-[13px] text-[color:var(--basalt-3)]">Loading.</p>;

  const accountLine =
    account === "signed-in" ? "Saved to your account." : account === "guest" ? "Saved on this device. Sign in to keep it on your account." : account === "signed-in-offline" ? "Saved on this device." : "";

  return (
    <div className="mt-6 flex flex-col gap-5" data-testid="brand-pick">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[color:var(--basalt-3)]">
        <span data-testid="progress-count">
          {prog.answered} of about {prog.total} answered
        </span>
        <span>{accountLine}</span>
        <span className="ml-auto flex gap-2">
          <button type="button" onClick={() => setView(view === "quiz" ? "results" : "quiz")} className={BTN_SECONDARY}>
            {view === "quiz" ? "see results" : card ? "keep picking" : "back"}
          </button>
        </span>
      </div>
      <div className="h-1 bg-[color:var(--bone-2)]" aria-hidden="true">
        <div className="h-1 bg-[color:var(--gold)] transition-[width] duration-200" style={{ width: `${prog.total ? (prog.answered / prog.total) * 100 : 0}%` }} />
      </div>
      {status && (
        <p role="alert" className="text-[13px] text-[color:var(--basalt)]">
          {status}
        </p>
      )}

      {view === "quiz" && card && (
        <section aria-labelledby="pick-question">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className={EYEBROW}>
              {ASPECTS[card.aspect].label} · {prog.aspectAnswered + 1} of {prog.aspectTotal}
              {card.round > 0 ? " · rematch" : ""}
            </div>
            <div className="font-mono text-[11px] text-[color:var(--basalt-3)]">keys 1 and 2</div>
          </div>
          <h2 id="pick-question" className="mt-2 text-[18px] text-[color:var(--basalt)]">
            {ASPECTS[card.aspect].question}
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[card.left, card.right].map((id, i) => (
              <Choice key={`${answerKey(card)}:${id}`} id={id} slot={i + 1} aspect={card.aspect} onChoose={() => void record(card, id)} />
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <label htmlFor="pick-note" className={EYEBROW}>
              why, optional
            </label>
            <textarea
              id="pick-note"
              value={note}
              maxLength={NOTE_MAX}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="What tipped it?"
              className="w-full border border-[color:var(--hairline)] bg-white/70 px-3 py-2 rounded-sm text-[14px] text-[color:var(--basalt)]"
            />
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={() => void record(card, null)} className="text-[12px] small-caps underline underline-offset-4 text-[color:var(--basalt-3)] min-h-[44px]">
                skip
              </button>
              <button type="button" onClick={() => void startOver()} className="text-[12px] small-caps underline underline-offset-4 text-[color:var(--basalt-3)] min-h-[44px]">
                start over
              </button>
            </div>
          </div>
        </section>
      )}

      {view === "quiz" && !card && (
        <section className={`${PANEL} p-5`} role="status">
          <div className={EYEBROW}>done</div>
          <p className="mt-2 text-[15px] text-[color:var(--basalt)]">Every pair has met and the ranking is stable.</p>
          <button type="button" onClick={() => setView("results")} className={`${BTN_PRIMARY} mt-4`}>
            see results
          </button>
        </section>
      )}

      {view === "results" && <ResultsView results={results} answers={answers} onStartOver={() => void startOver()} />}
    </div>
  );
}

function Choice({ id, slot, aspect, onChoose }: { id: DirectionId; slot: number; aspect: AspectId; onChoose: () => void }) {
  const d = DIRECTIONS[id];
  const p = d.palette;
  return (
    <article className={`${PANEL} flex flex-col overflow-hidden`} data-testid={`choice-${slot}`} data-direction={id}>
      <div className="flex flex-1 flex-col gap-3 p-4" style={{ background: p.bg, color: p.text }}>
        <div className="flex items-baseline justify-between gap-2">
          <span style={{ fontFamily: `"${d.display}", serif` }} className="text-[22px] leading-none">
            {d.name}
          </span>
          <span className="text-[11px]" style={{ color: p.muted }}>
            {d.movement}
          </span>
        </div>
        <MediaBlock id={id} aspect={aspect} />
        {aspect === "type" && <TypeSpecimen id={id} />}
        {aspect === "overall" && (
          <p className="text-[13px] leading-[1.5]" style={{ color: p.muted }}>
            {d.pitch}
          </p>
        )}
        <Swatches id={id} />
      </div>
      <button type="button" onClick={onChoose} className={`${BTN_PRIMARY} m-3 text-[13px]`} aria-label={`choose ${d.name}, key ${slot}`}>
        <span className="font-mono mr-2">{slot}</span> choose {d.name}
      </button>
    </article>
  );
}

function MediaBlock({ id, aspect }: { id: DirectionId; aspect: AspectId }) {
  const items = mediaFor(aspect, id);
  const p = DIRECTIONS[id].palette;
  const square = aspect === "overall" || aspect === "logo";
  return (
    <div className={`grid gap-2 ${items.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
      {items.map((m) =>
        m.kind === "video" ? (
          <video key={m.src} src={m.src} poster={m.poster} muted loop autoPlay playsInline controls preload="metadata" aria-label={m.alt} className="w-full aspect-video rounded-sm bg-black" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={m.src}
            src={m.src}
            alt={m.alt}
            decoding="async"
            className={`w-full rounded-sm ${square ? "aspect-square object-contain p-3" : "aspect-[16/10] object-cover object-top"}`}
            style={{ background: aspect === "logo" ? p.surf : undefined, border: `1px solid ${p.muted}33` }}
          />
        ),
      )}
    </div>
  );
}

function TypeSpecimen({ id }: { id: DirectionId }) {
  const d = DIRECTIONS[id];
  return (
    <div className="text-[12px]" style={{ color: d.palette.muted }}>
      <div>display {d.display}</div>
      <div>body {d.body}</div>
    </div>
  );
}

function Swatches({ id }: { id: DirectionId }) {
  const p = DIRECTIONS[id].palette;
  const list: [string, string][] = [
    ["bg", p.bg],
    ["surface", p.surf],
    ["text", p.text],
    ["muted", p.muted],
    ["accent", p.acc],
    ["highlight", p.hl],
  ];
  return (
    <div className="flex gap-1" aria-label="palette">
      {list.map(([k, v]) => (
        <span key={k} title={`${k} ${v}`} className="h-4 flex-1 rounded-[2px]" style={{ background: v, border: `1px solid ${p.muted}55` }} />
      ))}
    </div>
  );
}

function ResultsView({ results, answers, onStartOver }: { results: ReturnType<typeof buildResults>; answers: Answer[]; onStartOver: () => void }) {
  const [copied, setCopied] = useState(false);
  const date = new Date().toISOString().slice(0, 10);
  const summary = shareSummary(results, date);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const exportJson = () => {
    const body = JSON.stringify({ kind: "bucket.brand-pick", version: 1, exportedAt: new Date().toISOString(), answers, ranking: { overall: results.overall, byAspect: results.byAspect } }, null, 2);
    const url = URL.createObjectURL(new Blob([body], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `bucket-brand-pick-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (answers.length === 0) {
    return <p className="text-[14px] text-[color:var(--basalt-2)]">No answers yet. Pick a few and the ranking shows up here.</p>;
  }

  return (
    <div className="flex flex-col gap-6" data-testid="results">
      <section className={`${PANEL} p-5`}>
        <h2 className={EYEBROW}>overall</h2>
        <ol className="mt-3 flex flex-col gap-2">
          {results.overall.map((r, i) => (
            <li key={r.id} className="grid grid-cols-[2ch_7rem_1fr_3.5rem] items-center gap-3 text-[14px] text-[color:var(--basalt)]" data-testid="overall-row">
              <span className="font-mono text-[12px] text-[color:var(--basalt-3)]">{i + 1}</span>
              <span>{DIRECTIONS[r.id].name}</span>
              <span className="h-2 rounded-sm bg-[color:var(--bone-2)]">
                <span className="block h-2 rounded-sm" style={{ width: pct(r.score), background: DIRECTIONS[r.id].palette.acc }} />
              </span>
              <span className="font-mono text-[12px] text-right">{pct(r.score)}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[12px] text-[color:var(--basalt-3)]">Bradley-Terry fit over every pick. The percent is the chance it beats an average direction.</p>
      </section>

      <section>
        <h2 className={EYEBROW}>by aspect</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ASPECT_IDS.map((aspect) => (
            <div key={aspect} className={`${PANEL} p-4`} data-testid={`aspect-${aspect}`}>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-[13px] text-[color:var(--basalt)]">{ASPECTS[aspect].label}</h3>
                <span className="text-[11px] text-[color:var(--basalt-3)]">
                  {results.answered[aspect]} picks{stable(answers, aspect) ? " · stable" : ""}
                </span>
              </div>
              {results.answered[aspect] === 0 ? (
                <p className="mt-2 text-[12px] text-[color:var(--basalt-3)]">Not started.</p>
              ) : (
                <ol className="mt-2 flex flex-col gap-1 text-[13px] text-[color:var(--basalt-2)]">
                  {results.byAspect[aspect].map((r, i) => (
                    <li key={r.id} className="flex justify-between gap-2">
                      <span>
                        {i + 1}. {DIRECTIONS[r.id].name}
                      </span>
                      <span className="font-mono text-[11px]">{pct(r.score)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className={EYEBROW}>your notes</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {results.overall.map((r) => {
            const notes = results.notes[r.id];
            return (
              <div key={r.id} className={`${PANEL} p-4`} data-testid={`notes-${r.id}`}>
                <h3 className="text-[14px] text-[color:var(--basalt)]">{DIRECTIONS[r.id].name}</h3>
                {notes.length === 0 ? (
                  <p className="mt-1 text-[12px] text-[color:var(--basalt-3)]">No notes.</p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-2">
                    {notes.map((n, i) => (
                      <li key={i} className="text-[13px] leading-[1.5] text-[color:var(--basalt-2)]">
                        <span className="small-caps text-[10px] tracking-[0.12em] text-[color:var(--basalt-3)]">
                          {ASPECTS[n.aspect].label} · {n.chose === null ? "skipped" : n.chose ? "picked" : "lost"} vs {DIRECTIONS[n.against].name}
                        </span>
                        <p>{n.note}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className={`${PANEL} p-5`}>
        <h2 className={EYEBROW}>share</h2>
        <textarea readOnly value={summary} rows={Math.min(14, summary.split("\n").length + 1)} className="mt-3 w-full border border-[color:var(--hairline)] bg-white/70 px-3 py-2 rounded-sm font-mono text-[12px] text-[color:var(--basalt)]" data-testid="share-summary" />
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => void copy()} className={BTN_PRIMARY}>
            {copied ? "copied" : "copy summary"}
          </button>
          <button type="button" onClick={exportJson} className={BTN_SECONDARY}>
            export json
          </button>
          <button type="button" onClick={onStartOver} className={BTN_SECONDARY}>
            start over
          </button>
        </div>
      </section>
    </div>
  );
}

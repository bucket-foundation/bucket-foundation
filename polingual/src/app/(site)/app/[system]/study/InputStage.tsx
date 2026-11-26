"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loadBundle, type InputBundle } from "@academy/input-selector";
import { chooseUnit, dueLemmas, exposureRows, learnerFromState, toggleTap, type StageChoice, type TapState } from "@academy/input-stage";
import type { useLangSystem } from "@learn/languages/useLangSystem";
import { Button, Card, Stage } from "@/ui";
import styles from "../../app.module.css";
import own from "./InputStage.module.css";

type Lang = ReturnType<typeof useLangSystem>;

export function glossFor(h: Lang, lang: string, lemma: string): string | null {
  const id = h.resolve?.(lang, lemma);
  if (!id || !h.corpus) return null;
  return h.corpus.byId.get(id.slice(id.indexOf(":") + 1))?.gloss ?? null;
}

function useChoice(h: Lang, lang: string | undefined): StageChoice | null | "loading" {
  const [bundle, setBundle] = useState<InputBundle | null | "loading">("loading");
  useEffect(() => {
    if (!lang) return;
    let live = true;
    loadBundle(lang).then((b) => live && setBundle(b));
    return () => {
      live = false;
    };
  }, [lang]);
  return useMemo(() => {
    if (bundle === "loading") return "loading";
    if (!bundle || !lang || !h.resolve) return null;
    const now = Date.now();
    const tier = h.system?.placement[lang] ?? 0;
    return chooseUnit(bundle, learnerFromState(h.state, lang, h.resolve, now, tier, dueLemmas(bundle, h.state, lang, h.resolve, now)));
  }, [bundle, lang, h.resolve, h.state, h.system]);
}

function GlossList({ h, lang, newWords, glossed }: { h: Lang; lang: string; newWords: string[]; glossed: string[] }) {
  const words = [...newWords, ...glossed];
  const shown = words.filter((l) => glossFor(h, lang, l));
  const rest = words.length - shown.length;
  if (!words.length) return <p className={styles.body}>You know every word here.</p>;
  return (
    <>
      <ul className={own.glosses} data-testid="input-glosses">
        {shown.map((l) => (
          <li key={l} lang={lang} className={newWords.includes(l) ? own.newWord : undefined}>
            <b>{l}</b> <span>{glossFor(h, lang, l)}</span>
          </li>
        ))}
      </ul>
      {rest > 0 ? <p className={styles.small} data-testid="input-gloss-rest">{rest === 1 ? "1 more word" : `${rest} more words`} to tap while you read.</p> : null}
    </>
  );
}

function Lines({ h, lang, choice, taps, onTap }: { h: Lang; lang: string; choice: StageChoice; taps: TapState; onTap: (item: string, lemma: string) => void }) {
  return (
    <ol className={own.lines} data-testid="input-lines">
      {choice.items.map((item) => (
        <li key={item.id} lang={lang}>
          {item.tokens.map((t, k) => {
            const on = (taps.taps[item.id] ?? []).includes(t.lemma);
            return (
              <button key={k} type="button" className={on ? `${own.token} ${own.tapped}` : own.token} aria-pressed={on} title={on ? glossFor(h, lang, t.lemma) ?? t.lemma : undefined} onClick={() => onTap(item.id, t.lemma)} data-testid="input-token">
                {t.surface}
              </button>
            );
          })}
          {item.translation ? <span className={own.translation}>{item.translation}</span> : null}
        </li>
      ))}
    </ol>
  );
}

function Video({ choice }: { choice: StageChoice }) {
  const v = choice.items[0]?.media;
  if (!v) return null;
  const end = Math.ceil(choice.items[choice.items.length - 1].media?.end ?? v.end);
  const src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(v.videoId) + "?start=" + Math.floor(v.start) + "&end=" + end + "&cc_load_policy=0&rel=0";
  return <iframe className={own.video} title={choice.items[0].text} src={src} allow="autoplay; encrypted-media" data-testid="input-video" />;
}

function Play({ h, lang, choice, onFinish }: { h: Lang; lang: string; choice: StageChoice; onFinish: (taps: TapState, completed: boolean) => void }) {
  const [taps, setTaps] = useState<TapState>({ taps: {} });
  return (
    <>
      <Video choice={choice} />
      <Lines h={h} lang={lang} choice={choice} taps={taps} onTap={(item, lemma) => setTaps((s) => toggleTap(s, item, lemma))} />
      <p className={styles.small}>Tap a word you do not know.</p>
      <div className={styles.row}>
        <Button onClick={() => onFinish(taps, true)} data-testid="input-done">
          Done
        </Button>
        <Button variant="quiet" size="sm" onClick={() => onFinish(taps, false)} data-testid="input-skip">
          Skip
        </Button>
      </div>
    </>
  );
}

export default function InputStage({ h, onDone }: { h: Lang; onDone: () => void }) {
  const lang = h.system?.targets.find((l) => h.langStatus[l] === "ready");
  const choice = useChoice(h, lang);
  const [phase, setPhase] = useState<"gloss" | "play">("gloss");
  const started = useRef(0);

  useEffect(() => {
    if (choice === null) onDone();
  }, [choice, onDone]);

  if (choice === "loading" || choice === null || !lang) return <p className={styles.muted} aria-busy="true">Finding something to read</p>;

  const finish = (taps: TapState, completed: boolean) => {
    const seconds = started.current ? (Date.now() - started.current) / 1000 : 0;
    h.logExposures?.(lang, exposureRows(choice, taps, seconds, completed));
    onDone();
  };
  const start = () => {
    started.current = Date.now();
    setPhase("play");
  };

  return (
    <Stage ground="paper" strip={false} tv={false}>
      <Card as="section" className={`${styles.card} ${own.stage}`} data-testid="input-stage" data-unit={choice.unit.id}>
        <p className={styles.label}>{choice.items[0]?.media ? "Watch" : "Read"} · {choice.unit.kind === "episode" ? "story" : "sentences"}</p>
        {phase === "gloss" ? (
          <>
            <h1 className={styles.title}>Before you start</h1>
            <GlossList h={h} lang={lang} newWords={choice.plan.newWords} glossed={choice.plan.glossed} />
            <Button onClick={start} data-testid="input-start">
              Start
            </Button>
          </>
        ) : (
          <Play h={h} lang={lang} choice={choice} onFinish={finish} />
        )}
      </Card>
    </Stage>
  );
}

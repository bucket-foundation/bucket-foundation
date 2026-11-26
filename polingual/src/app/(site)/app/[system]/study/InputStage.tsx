"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadBundle, type InputBundle } from "@academy/input-selector";
import { chooseUnit, dueLemmas, exposureRows, inputMode, learnerFromState, type StageChoice, type Viewing } from "@academy/input-stage";
import InputPlay from "./InputPlay";
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

function useChoice(h: Lang, lang: string | undefined, shown: Readonly<Record<string, number>>): StageChoice | null | "loading" {
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
    return chooseUnit(bundle, learnerFromState(h.state, lang, h.resolve, now, tier, dueLemmas(bundle, h.state, lang, h.resolve, now), shown), inputMode() === "demo");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle, lang, h.resolve, h.system]);
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

export default function InputStage({ h, shown, onDone }: { h: Lang; shown: Readonly<Record<string, number>>; onDone: (unit: string | null, seconds: number) => void }) {
  const lang = h.system?.targets.find((l) => h.langStatus[l] === "ready");
  const choice = useChoice(h, lang, shown);
  const [phase, setPhase] = useState<"gloss" | "play">("gloss");
  const logged = useRef(false);

  useEffect(() => {
    if (!lang || choice === null) onDone(null, 0);
  }, [lang, choice, onDone]);

  const log = useCallback(
    (v: Viewing, completed: boolean) => {
      if (logged.current || !lang || !choice || choice === "loading") return;
      logged.current = true;
      const rows = exposureRows(choice, v, completed);
      if (rows.length) h.logExposures?.(lang, rows);
    },
    [h, lang, choice],
  );

  if (!lang || choice === "loading" || choice === null) return <p className={styles.muted} aria-busy="true">Finding something to read</p>;

  const finish = (v: Viewing | null) => {
    if (v) log(v, true);
    else logged.current = true;
    onDone(v ? choice.unit.id : null, v ? Object.values(v.seenMs).reduce((a, b) => a + b, 0) / 1000 : 0);
  };

  return (
    <Stage ground="paper" strip={false} tv={false}>
      <Card as="section" className={`${styles.card} ${own.stage}`} data-testid="input-stage" data-unit={choice.unit.id}>
        <p className={styles.label}>{choice.items[0]?.media ? "Watch" : "Read"} · {choice.unit.kind === "episode" ? "story" : "sentences"}</p>
        {phase === "gloss" ? (
          <>
            <h1 className={styles.title}>Before you start</h1>
            <GlossList h={h} lang={lang} newWords={choice.plan.newWords} glossed={choice.plan.glossed} />
            <div className={own.actions}>
              <Button onClick={() => setPhase("play")} data-testid="input-start">
                Start
              </Button>
            </div>
          </>
        ) : (
          <InputPlay lang={lang} choice={choice} gloss={(l) => glossFor(h, lang, l)} onFinish={finish} onExit={(v) => log(v, false)} />
        )}
      </Card>
    </Stage>
  );
}

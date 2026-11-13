"use client";

import { useEffect } from "react";
import { speak } from "@/lib/academy/lang-client";
import { langDir, langName, type Exercise } from "@/lib/academy/lang-systems";
import { Button, FlagTile, Sticker } from "@/ui";
import { flagTileStyles } from "@/ui/FlagTile";
import styles from "../../app.module.css";

export default function WordCard({ ex, readings, onNext }: { ex: Exercise; readings: boolean; onNext: () => void }) {
  useEffect(() => {
    speak(ex.answer, ex.answerLang);
  }, [ex]);
  const r = ex.answerReading;
  const ipa = readings ? (r?.ipa ? `/${r.ipa.replace(/^\/|\/$/g, "")}/` : r?.roman ?? r?.kana) : undefined;
  return (
    <section className={styles.wordCard} data-testid="exercise" data-kind={ex.kind} data-lang={ex.lang}>
      <span className={styles.wordKind}>New word · {langName(ex.answerLang)}</span>
      <div className={styles.wordStage}>
        <Sticker name="seal" x="-6px" y="-10px" size={52} rotate={-10} />
        <Sticker name="torn-label" side="right" anchor="bottom" x="-14px" y="6px" size={84} rotate={8} />
        <FlagTile
          as="div"
          className={styles.wordTile}
          lang={ex.answerLang}
          code={ex.answerLang.toUpperCase()}
          label={langName(ex.answerLang)}
          word={ex.answer}
          reading={ipa}
          rtl={langDir(ex.answerLang) === "rtl"}
          play={<button type="button" className={flagTileStyles.play} aria-label={`Play ${ex.answer}`} onClick={() => speak(ex.answer, ex.answerLang)} />}
        />
      </div>
      <dl className={styles.wordRows}>
        <div><dt>Meaning</dt><dd lang={ex.promptLang} dir={langDir(ex.promptLang)}>{langName(ex.promptLang)}: {ex.prompt}</dd></div>
        {ipa ? <div><dt>Say it</dt><dd data-testid="intro-reading">{ipa}</dd></div> : null}
        {ex.family?.length ? <div data-testid="family"><dt>Same root</dt><dd>{ex.family.map((f) => `${f.word} (${langName(f.lang)})`).join(" · ")}</dd></div> : null}
        {ex.note ? <div><dt>Note</dt><dd>{ex.note}</dd></div> : null}
      </dl>
      <div className={styles.wordDock}>
        <Button block onClick={onNext} data-testid="next">Got it</Button>
      </div>
    </section>
  );
}

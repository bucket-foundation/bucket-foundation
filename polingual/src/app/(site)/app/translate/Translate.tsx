"use client";

import { local } from "@/lib/storage";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { LangCorpus } from "@academy/lang-systems";
import { langName, LANGS } from "@academy/lang-systems";
import { loadLangCorpus } from "@academy/lang-client";
import { bcp47, say } from "@/lib/speak";
import { pickerGroups, pushRecent, readRecent, suggestions, translate, translateSources, type TranslateAnswer } from "@/lib/translate/engine";
import { WORD_SLUGS } from "@/lib/translate/slugs";
import { Button, ButtonLink, Field, FlagTile, Input, Sheet, Stage } from "@/ui";
import { flagTileStyles } from "@/ui/FlagTile";
import { useSystems } from "../useSystems";
import styles from "./translate.module.css";


const STICKERS = [
  { name: "ticket" as const, x: "2%", y: "16%", size: 170, rotate: -8 },
  { name: "calligraphy-ain" as const, x: "5%", y: "60%", size: 110, rotate: 9 },
  { name: "torn-label" as const, x: "2%", y: "12%", size: 150, rotate: 7, side: "right" as const },
  { name: "script-ru" as const, x: "6%", y: "62%", size: 80, rotate: -6, side: "right" as const, shadow: false },
];

function Picker({ label, value, all, mine, onPick, testId }: { label: string; value: string; all: string[]; mine: string[]; onPick: (l: string) => void; testId: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  useEffect(() => {
    if (!open) return;
    document.body.dataset.sheet = "open";
    return () => {
      delete document.body.dataset.sheet;
    };
  }, [open]);
  const groups = pickerGroups(all, mine, open ? readRecent(local()) : [], q, langName);
  const choose = (l: string) => {
    pushRecent(local(), l);
    onPick(l);
    setOpen(false);
    setQ("");
  };
  return (
    <div className={styles.picker}>
      <span className={styles.pickLabel}>{label}</span>
      <Button variant="secondary" size="md" onClick={() => setOpen(!open)} aria-expanded={open} data-testid={testId}>{langName(value)}</Button>
      {open ? (
        <div className={styles.menu} role="dialog" aria-label={`${label} language`}>
          <Input value={q} placeholder="Search languages" onChange={(e) => setQ(e.target.value)} autoFocus data-testid={`${testId}-search`} />
          {([["Recent", groups.recent], ["My languages", groups.mine], ["More", groups.more]] as const).map(([title, list]) =>
            list.length ? (
              <div key={title}>
                <p className={styles.menuHead}>{title}</p>
                <div className={styles.menuList}>
                  {list.map((l) => (
                    <button key={l} type="button" className={styles.menuItem} aria-pressed={l === value} onClick={() => choose(l)} data-testid={`${testId}-${l}`}>{langName(l)}</button>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function Translate() {
  const { state } = useSystems();
  const [corpus, setCorpus] = useState<LangCorpus | null | undefined>(undefined);
  const mine = useMemo(() => {
    const s = state.status === "ready" ? state.systems : [];
    return [...new Set([...s.map((x) => x.root), ...s.flatMap((x) => x.targets)])];
  }, [state]);
  const [source, setSource] = useState("en");
  const [target, setTarget] = useState("es");
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState<TranslateAnswer | null | "none">(null);

  useEffect(() => {
    void loadLangCorpus().then(setCorpus);
  }, []);
  useEffect(() => {
    if (state.status !== "ready" || !state.systems[0]) return;
    setSource(state.systems[0].root);
    setTarget(state.systems[0].targets[0] ?? "es");
  }, [state]);

  const all = useMemo(() => (corpus ? translateSources(corpus, mine) : []), [corpus, mine]);
  const targets = useMemo(() => [target, ...mine.filter((l) => l !== target && l !== source)], [target, mine, source]);
  const hints = corpus && text.trim().length >= 2 && answer === null ? suggestions(corpus, text, [source], 5) : [];

  function run(e?: FormEvent, q = text) {
    e?.preventDefault();
    if (!corpus) return;
    setAnswer(translate(corpus, q, [source], targets) ?? "none");
  }

  return (
    <Stage ground="cut" stickers={STICKERS} tiles={false}>
      <Sheet className={styles.sheet} data-testid="translate">
        <p className={styles.eyebrow}>Translate</p>
        <h1 className={styles.title}>Translate a word into your languages</h1>
        <div className={styles.langs}>
          <Picker label="From" value={source} all={all} mine={mine} onPick={(l) => { setSource(l); setAnswer(null); }} testId="pick-source" />
          <Button variant="ghost" size="md" aria-label="Swap languages" onClick={() => { setSource(target); setTarget(source); setAnswer(null); }} data-testid="swap">Swap</Button>
          <Picker label="To" value={target} all={all} mine={mine} onPick={(l) => { setTarget(l); setAnswer(null); }} testId="pick-target" />
        </div>
        <form onSubmit={run} className={styles.form}>
          <Field label={`Word in ${langName(source)}`}>
            <Input value={text} onChange={(e) => { setText(e.target.value); setAnswer(null); }} lang={LANGS[source]?.bcp47} autoComplete="off" data-testid="translate-input" />
          </Field>
          <Button type="submit" disabled={!text.trim() || !corpus} data-testid="translate-go">{corpus === undefined ? "Loading words" : "Translate"}</Button>
        </form>
        {hints.length ? (
          <div className={styles.hints}>
            {hints.map((h) => (
              <button key={h.itemId} type="button" className={styles.hint} onClick={() => { setText(h.form); run(undefined, h.form); }}>{h.form}</button>
            ))}
          </div>
        ) : null}
        {corpus === null ? <p className={styles.note} role="alert">The word list did not load. Reload the page to try again.</p> : null}
        {answer === "none" ? <p className={styles.note} role="status" data-testid="translate-none">No match in the course words yet. Try a single common word.</p> : null}
        {answer && answer !== "none" ? (
          <div data-testid="translate-results">
            <p className={styles.note}>{langName(answer.source)}: <b>{answer.headword}</b></p>
            <ul className={styles.tiles}>
              {Object.entries(answer.rows).map(([l, w], i) => (
                <li key={l} className={styles.tileCell}>
                  <FlagTile as="div" lang={l} code={l.toUpperCase()} label={langName(l)} word={w} index={i} reading={corpus?.byId.get(answer.itemId)?.readings[l]?.ipa ?? corpus?.byId.get(answer.itemId)?.readings[l]?.roman} play={<button type="button" className={flagTileStyles.play} aria-label={`Hear ${w} in ${langName(l)}`} onClick={() => say(w, bcp47(l))} />} />
                  {WORD_SLUGS.has(answer.itemId) ? <ButtonLink variant="quiet" size="sm" href={`/word/${answer.itemId}`} data-testid="translate-word-link">Open the word page</ButtonLink> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Sheet>
    </Stage>
  );
}

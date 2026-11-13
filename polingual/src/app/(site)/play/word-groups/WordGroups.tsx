"use client";

import { useMemo, useState } from "react";
import { formOf, starter, wordId } from "@/lib/daily/words";
import { dailyGroups, emptyGroups, GROUP_MISTAKES, groupId, groupsFinished, groupsMistakes, submitGroup, toggleTile, type GroupLink } from "@/lib/daily/groups";
import { mixed, SeededRandom } from "@/lib/daily/rng";
import { Button } from "@/ui";
import { DailyWorld, Heading, Loading, Results } from "../daily/DailyWorld";
import { useDaily } from "../daily/useDaily";
import { langName } from "../langs";
import styles from "../daily/daily.module.css";


const THEMES: Record<string, string> = { adjective: "Describing words", animal: "Animals", body: "The body", color: "Colors", family: "Family", food: "Food", nature: "Nature", number: "Numbers", object: "Things", time: "Time", verb: "Verbs" };

function linkName(l: GroupLink): string {
  if (l.kind === "language") return langName(l.lang);
  if (l.kind === "theme") return THEMES[l.theme] ?? l.theme;
  return `${langName(l.lang)}: ${THEMES[l.theme] ?? l.theme}`;
}

const NOTE: Record<string, string> = { oneAway: "One away.", miss: "Not a group.", repeated: "Already tried.", solved: "Group found." };

export default function WordGroups() {
  const { state, finish } = useDaily("word-groups");
  const puzzle = useMemo(() => {
    if (state.status !== "ready") return null;
    const c = state.corpus;
    return dailyGroups(starter(state.system.root, state.system.targets, c, 60), state.day, state.system.root, state.system.targets, (w) => c.byId.get(w.itemId)?.category ?? null, (w, l) => {
      const item = c.byId.get(w.itemId);
      return !!item && formOf(item, l)?.toLowerCase() === w.form.toLowerCase();
    });
  }, [state]);
  const [g, setG] = useState(emptyGroups);
  const [order, setOrder] = useState<string[] | null>(null);
  const [note, setNote] = useState("");

  if (state.status !== "ready") return <DailyWorld id="word-groups"><Loading state={state.status} /></DailyWorld>;
  if (state.done) return <DailyWorld id="word-groups"><Results title="Word Groups" result={state.done} url="https://polingual.com/play/word-groups" /></DailyWorld>;
  if (!puzzle) return <DailyWorld id="word-groups"><Loading state="error" /></DailyWorld>;

  const gone = new Set(puzzle.groups.filter((x) => g.solved.includes(groupId(x))).flatMap((x) => x.words.map(wordId)));
  const ids = (order ?? puzzle.tiles.map(wordId)).filter((id) => !gone.has(id));
  const byId = new Map(puzzle.tiles.map((w) => [wordId(w), w]));

  function submit() {
    if (!puzzle || state.status !== "ready") return;
    const [next, out] = submitGroup(puzzle, g);
    setG(next);
    setNote(NOTE[out] ?? "");
    if (groupsFinished(puzzle, next)) {
      const solved = new Set(next.solved);
      void finish({ game: "word-groups", day: state.day, score: next.solved.length, total: puzzle.groups.length, pattern: next.pattern, words: puzzle.groups.flatMap((x) => x.words.map((w) => ({ lang: w.lang, itemId: w.itemId, form: w.form, gloss: w.gloss, right: solved.has(groupId(x)) }))) });
    }
  }

  return (
    <DailyWorld id="word-groups">
      <Heading eyebrow={`Word Groups · ${state.day}`} title="Sort sixteen words into four groups" blurb="Groups share a language, a theme or both." />
      {puzzle.groups.filter((x) => g.solved.includes(groupId(x))).map((x, i) => (
        <div key={groupId(x)} className={styles.solved} data-i={i} data-testid="groups-solved">
          <b>{linkName(x.link)}</b>
          {x.words.map((w) => w.form).join(" · ")}
        </div>
      ))}
      <div className={styles.tiles} data-testid="groups-tiles">
        {ids.map((id) => {
          const w = byId.get(id)!;
          const group = puzzle.groups.findIndex((x) => x.words.some((y) => wordId(y) === id));
          return (
            <button key={id} type="button" className={styles.tile} aria-pressed={g.selected.includes(id)} lang={w.lang} onClick={() => setG(toggleTile(puzzle, g, id))} data-testid="groups-tile" data-group={group}>
              {w.form}
            </button>
          );
        })}
      </div>
      <p className={styles.blurb} role="status">{note || `${GROUP_MISTAKES - groupsMistakes(g)} mistakes left`}</p>
      <div className={styles.row}>
        <Button disabled={g.selected.length !== 4} onClick={submit} data-testid="groups-submit">Submit</Button>
        <Button variant="secondary" size="md" onClick={() => setOrder(mixed(ids, new SeededRandom(BigInt(Date.now()))))}>Shuffle</Button>
        <Button variant="quiet" size="sm" onClick={() => setG({ ...g, selected: [] })}>Clear</Button>
      </div>
    </DailyWorld>
  );
}

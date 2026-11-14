"use client";

import dynamic from "next/dynamic";
import { LANGS } from "@academy/lang-systems";
import { sceneOfChoices } from "@academy/ispy";
import { parseTile } from "@academy/lobby-tiles";
import { TileFace } from "@/app/tile";
import type { LobbyPrompt } from "@/lib/lobby/client";
import { choiceState, type Picked } from "@/lib/lobby/room";
import app from "../../app/app.module.css";
import { pieceClass } from "../GameWorld";
import spyStyles from "../ispy/ispy.module.css";
import { langName } from "../langs";
import { FlagSquare, LangCard } from "../LearnWord";
import { SceneHold } from "../LazyHolds";
import { PromptCard } from "../Pieces";
import styles from "../play.module.css";
import type { LiveRoom } from "./useRoomGame";

const Scene = dynamic(() => import("../ispy/Scene"), { loading: () => <SceneHold /> });

export type ChoiceProps = { g: LiveRoom; index: number; mine: Picked | null; done: boolean };
type WithPrompt = ChoiceProps & { prompt: LobbyPrompt };

export function RoomChoices(p: ChoiceProps & { prompt: LobbyPrompt | null }) {
  const { prompt } = p;
  if (!prompt) return <p className={app.muted} aria-busy="true">Loading the round</p>;
  if (prompt.mode === "spy" && sceneOfChoices(prompt.choices)) return <SpyChoices {...p} prompt={prompt} />;
  if (prompt.mode === "flag") return <ListChoices {...p} prompt={prompt} flag />;
  if (prompt.mode === "meaning") return <ListChoices {...p} prompt={prompt} flag={false} />;
  if (prompt.mode === "mixed") return <MixedChoices {...p} prompt={prompt} />;
  return <PlainChoices {...p} prompt={prompt} />;
}

function SpyChoices({ g, index, mine, done, prompt }: WithPrompt) {
  return (
    <>
      <div className={spyStyles.spy}>
        <span className={spyStyles.spyLead}>I spy…</span>
        <span className={spyStyles.spyWord} lang={prompt.lang ?? undefined} dir={prompt.lang && LANGS[prompt.lang]?.rtl ? "rtl" : undefined} data-testid="prompt">{prompt.gloss}</span>
        {prompt.lang ? <span className={app.small}>{langName(prompt.lang)}</span> : null}
      </div>
      <Scene scene={sceneOfChoices(prompt.choices)!} marks={mine ? { [mine.choice]: mine.pending ? "answer" : mine.correct ? "right" : "wrong" } : {}} locked={done} onTap={(c) => void g.answer(index, c)} />
    </>
  );
}

function ListChoices({ g, index, mine, done, prompt, flag }: WithPrompt & { flag: boolean }) {
  const doubled = g.lobby.powers.some((p) => p.round === index && p.kind === "double");
  return (
    <>
      <div className={styles.prompt}>
        <p className={app.small}>{flag ? "Which language is this word?" : "What does this word mean?"}</p>
        <div className={styles.promptTile}>
          {flag ? <TileFace as="div" lang="" plain word={prompt.gloss} attrs={{ "data-testid": "prompt" }} /> : <TileFace as="div" lang={prompt.lang ?? ""} word={prompt.gloss} rtl={prompt.lang ? LANGS[prompt.lang]?.rtl : undefined} attrs={{ "data-testid": "prompt" }} />}
        </div>
        {!flag && prompt.lang ? <p className={app.small}>{langName(prompt.lang)}</p> : null}
      </div>
      <ul className={styles.choices}>
        {prompt.choices.filter((c) => !prompt.hide?.includes(c)).map((c) => (
          <li key={c}>
            <button type="button" className={`${styles.choice} ${flag ? styles.choiceFlag : pieceClass("ticket")}`} data-state={choiceState(mine, done, c)} disabled={done} onClick={() => void g.answer(index, c)} data-testid="choice">
              {flag ? <LangCard lang={c} big /> : c}
            </button>
          </li>
        ))}
      </ul>
      {!flag && doubled ? <p className={styles.powerOn} data-testid="double-on">Double points this round</p> : null}
    </>
  );
}

function MixedChoices({ g, index, mine, done, prompt }: WithPrompt) {
  return (
    <>
      <div className={styles.prompt}>
        <PromptCard label="Pick the word that means" gloss={prompt.gloss} note="The tiles mix this room's languages. One is right." />
      </div>
      <ul className={styles.choiceTiles}>
        {prompt.choices.map((c, i) => {
          const t = parseTile(c);
          return (
            <li key={c}>
              <TileFace as="button" lang={t.lang} word={t.form} rtl={LANGS[t.lang]?.rtl} index={i} className={styles.choiceTile} attrs={{ "data-state": choiceState(mine, done, c), "data-testid": "choice", "data-lang": t.lang, "aria-label": `${t.form}, ${langName(t.lang)}`, disabled: done, onClick: () => void g.answer(index, c) }} />
              <span className={styles.choiceLang}>
                <FlagSquare lang={t.lang} size={14} />
                {langName(t.lang)}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function PlainChoices({ g, index, mine, done, prompt }: WithPrompt) {
  return (
    <>
      <div className={styles.prompt}>
        <PromptCard label="Pick the word that means" gloss={prompt.gloss} />
      </div>
      <ul className={styles.choiceTiles}>
        {prompt.choices.map((c, i) => (
          <li key={c}>
            <TileFace as="button" lang={prompt.lang ?? ""} plain={!prompt.lang} word={c} rtl={prompt.lang ? LANGS[prompt.lang]?.rtl : undefined} index={i} className={styles.choiceTile} attrs={{ "data-state": choiceState(mine, done, c), "data-testid": "choice", disabled: done, onClick: () => void g.answer(index, c) }} />
          </li>
        ))}
      </ul>
    </>
  );
}

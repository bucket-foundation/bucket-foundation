"use client";

import type { ReactNode } from "react";
import { readBreaks } from "@/lib/lobby/breaks";
import { local } from "@/lib/storage";
import Ad from "./Ad";
import { LearnPanel, WordReveal } from "./Reveal";

type RevealWord = Parameters<typeof WordReveal>[0]["words"][number];
type Missed = Parameters<typeof LearnPanel>[0]["missed"];

export default function GameResults({ title, words, rootLang, missed, ad = false }: { title: ReactNode; words: RevealWord[]; rootLang: string; missed: Missed; ad?: boolean }) {
  return (
    <>
      <WordReveal rootLang={rootLang} title={title} words={words} />
      <LearnPanel missed={missed} />
      {ad && readBreaks(local).games >= 2 ? <Ad placement="results" /> : null}
    </>
  );
}

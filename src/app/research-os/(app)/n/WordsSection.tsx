"use client";

import { OUTAGE_COPY, isTransientOutage, readErrorCode } from "@/lib/research-os/outage";
import { useCallback, useEffect, useState } from "react";
import Section from "./Section";
import { KAIKKI_ATTRIBUTION, OSHB_ATTRIBUTION, glossFormLabel, langName, type ChainStep, type NodeWord } from "@/lib/research-os/node-words";
import RootTexts from "../RootTexts";

const FIRST = 12;

function Step({ step }: { step: ChainStep }) {
  if (step.rel === "part" && step.chain) {
    return (
      <span>
        <span lang={step.lang} dir="auto">{step.form}</span>
        {step.chain.length > 0 && (
          <span className="text-[color:var(--basalt-3)]">
            {" "}({step.chain.map((c, i) => <span key={i}>{i ? " ← " : "← "}<Step step={c} /></span>)})
          </span>
        )}
      </span>
    );
  }
  return (
    <span>
      <span className="small-caps text-[10px] tracking-[0.12em] text-[color:var(--basalt-3)]">{langName(step.lang)} </span>
      <span lang={step.lang.split("-")[0]} dir="auto" className="text-[color:var(--basalt)]">{step.form}</span>
      {step.gloss && <span className="text-[color:var(--basalt-3)]"> “{step.gloss}”</span>}
      {step.components && step.components.length > 0 && (
        <span className="text-[color:var(--basalt-3)]">
          {" "}= {step.components.map((c, i) => <span key={i}>{i ? " + " : ""}<span lang="zh">{c.form}</span>{c.gloss ? ` “${c.gloss}”` : ""}</span>)}
        </span>
      )}
    </span>
  );
}

function WordRow({ w }: { w: NodeWord }) {
  const texts = w.rootTexts;
  return (
    <li className="grid gap-1 py-3 border-t border-[color:var(--hairline)] first:border-t-0 md:grid-cols-[9rem_1fr]">
      <div className="small-caps text-[10px] tracking-[0.16em] text-[color:var(--aegean-deep)] pt-1">{w.langName}</div>
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span lang={w.lang} dir="auto" className="text-[20px] leading-tight text-[color:var(--basalt)] break-words">{w.word}</span>
          {w.roman && <span className="italic text-[13px] text-[color:var(--basalt-2)]">{w.roman}</span>}
          {w.uncertain && <span className="small-caps text-[10px] tracking-[0.14em] px-1.5 py-0.5 border border-[color:var(--hairline)] rounded-sm text-[color:var(--basalt-3)]">uncertain match</span>}
        </div>
        {w.gloss && <p className="text-[13px] leading-[1.6] text-[color:var(--basalt-2)] max-w-[68ch]">{w.gloss}</p>}
        {w.rootForm && (
          <p className="text-[13px] leading-[1.6] text-[color:var(--basalt-2)]">
            <span className="small-caps text-[10px] tracking-[0.14em] text-[color:var(--gold-deep)]">root </span>
            <span lang={(w.rootLang ?? "").split("-")[0] || undefined} dir="auto" className="text-[15px] text-[color:var(--basalt)]">{w.rootForm}</span>
            {w.rootLangName && <span className="text-[color:var(--basalt-3)]"> · {w.rootLangName}</span>}
            {w.rootGloss && <span> · “{w.rootGloss}”</span>}
            {w.rootGlossForm && <span className="ml-1 small-caps text-[10px] tracking-[0.14em] text-[color:var(--basalt-3)]">{glossFormLabel(w.rootGlossForm)}</span>}
            {w.rootSource === "oshb" && <span className="text-[color:var(--basalt-3)]"> · from OSHB</span>}
            {w.rootUncertain && <span className="ml-1 small-caps text-[10px] tracking-[0.14em] text-[color:var(--basalt-3)]">uncertain root</span>}
          </p>
        )}
        {w.chain.length > 0 && (
          <details className="text-[12px] leading-[1.7] text-[color:var(--basalt-2)]">
            <summary className="cursor-pointer text-[color:var(--basalt-3)] hover:text-[color:var(--basalt)]">descent, {w.chain.length} {w.chain.length === 1 ? "step" : "steps"}</summary>
            <ol className="mt-1 flex flex-col gap-0.5 pl-3 border-l border-[color:var(--hairline)]">
              {w.chain.map((c, i) => (
                <li key={i}>
                  <span className="text-[color:var(--basalt-3)]">← </span>
                  <Step step={c} />
                </li>
              ))}
            </ol>
          </details>
        )}
        <RootTexts texts={texts} lang={w.lang} uncertain={w.uncertain} rootUncertain={w.rootUncertain} />
      </div>
    </li>
  );
}

export default function WordsSection({ nodeId }: { nodeId: string }) {
  const [words, setWords] = useState<NodeWord[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "outage" | "error">("loading");
  const [all, setAll] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch(`/api/research-os/words?id=${encodeURIComponent(nodeId)}`, { cache: "no-store" });
      if (!res.ok) return setState(isTransientOutage(res.status, await readErrorCode(res)) ? "outage" : "error");
      const body = (await res.json()) as { words: NodeWord[] };
      setWords(body.words ?? []);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [nodeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const list = words ?? [];
  const term = list.find((w) => w.enTerm)?.enTerm ?? null;
  const shown = all ? list : list.slice(0, FIRST);
  const rooted = list.filter((w) => w.rootForm).length;
  const uncertain = list.filter((w) => w.uncertain).length;

  return (
    <Section id="words" level="awareness" title="in other languages" meta={list.length ? `${list.length} languages · ${rooted} with a root${uncertain ? ` · ${uncertain} uncertain` : ""}` : undefined}>
      {state === "loading" && <p className="text-[13px] text-[color:var(--basalt-3)]">Reading the words.</p>}
      {(state === "error" || state === "outage") && (
        <p className="text-[13px] text-[color:var(--basalt-3)]">
          {state === "outage" ? OUTAGE_COPY.body : "The words did not load."}{" "}
          <button type="button" className="underline underline-offset-4" onClick={() => void load()}>
            try again
          </button>
        </p>
      )}
      {state === "ready" && list.length === 0 && <p className="text-[13px] text-[color:var(--basalt-3)]">No words are linked to this node yet.</p>}
      {state === "ready" && list.length > 0 && (
        <div className="flex flex-col gap-2">
          {term && (
            <p className="text-[13px] text-[color:var(--basalt-2)] max-w-[68ch]">
              The word for <span className="italic">{term}</span> in each language, what it means there, and the root it grew from.
            </p>
          )}
          <ul className="flex flex-col">
            {shown.map((w) => (
              <WordRow key={`${w.lang}:${w.word}`} w={w} />
            ))}
          </ul>
          {list.length > FIRST && (
            <button type="button" onClick={() => setAll((v) => !v)} className="self-start text-[12px] underline underline-offset-4 text-[color:var(--aegean-deep)]">
              {all ? "show fewer" : `show all ${list.length} languages`}
            </button>
          )}
          <p className="text-[11px] text-[color:var(--basalt-3)]">
            Words, meanings and etymologies from{" "}
            <a href={KAIKKI_ATTRIBUTION.wiktionary} target="_blank" rel="noreferrer" className="underline underline-offset-2">Wiktionary</a>
            {" via "}
            <a href={KAIKKI_ATTRIBUTION.kaikki} target="_blank" rel="noreferrer" className="underline underline-offset-2">Kaikki.org</a>
            {", "}
            <a href={KAIKKI_ATTRIBUTION.license} target="_blank" rel="noreferrer" className="underline underline-offset-2">CC BY-SA 4.0</a>
          </p>
          {list.some((w) => w.lang === "he") && (
            <p className="text-[11px] text-[color:var(--basalt-3)]">
              Hebrew roots and verses: {OSHB_ATTRIBUTION.text}, under{" "}
              <a href={OSHB_ATTRIBUTION.license} target="_blank" rel="noreferrer" className="underline underline-offset-2">CC BY 4.0</a>
              . {OSHB_ATTRIBUTION.wlc}
            </p>
          )}
        </div>
      )}
    </Section>
  );
}

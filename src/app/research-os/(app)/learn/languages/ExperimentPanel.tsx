"use client";

import { useEffect, useMemo, useState } from "react";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/ui";
import { currentConsent, joinStudy, leaveStudy, markTaken, readEnrolment, readTaken } from "@/lib/academy/experiment-store";
import { loadYesNoForms } from "@/lib/academy/lang-client";
import { scoreTest, testDue, type TestItem, type YesNoForms } from "@/lib/academy/yes-no-test";
import type { LangSystemHandle } from "./useLangSystem";

const DAY_MS = 86_400_000;

type Phase = "baseline" | "day28";

export function experimentStep(now: number): { kind: "disclose" } | { kind: "test"; phase: Phase } | null {
  const c = currentConsent();
  if (!c.flag || !c.uploadOpen || c.optedOut) return null;
  if (!c.disclosed) return { kind: "disclose" };
  const taken = readTaken();
  if (!taken.baseline) return { kind: "test", phase: "baseline" };
  const e = readEnrolment();
  const due = testDue(e ? e.at : null, now, taken);
  return due === "day28" ? { kind: "test", phase: "day28" } : null;
}

export default function ExperimentPanel({ h, lang, onDone }: { h: LangSystemHandle; lang: string; onDone: () => void }) {
  const [step, setStep] = useState(() => experimentStep(Date.now()));
  const [left, setLeft] = useState(false);
  if (!step) {
    const c = currentConsent();
    if (left || !c.flag || !c.disclosed || c.optedOut) return null;
    return (
      <button type="button" className="self-start text-[12px] underline underline-offset-4 text-[color:var(--basalt-3)]" onClick={() => { leaveStudy(); setLeft(true); }} data-testid="study-leave">
        leave the reading-time study
      </button>
    );
  }
  if (step.kind === "disclose")
    return (
      <Disclosure
        onJoin={() => {
          joinStudy();
          setStep(experimentStep(Date.now()));
        }}
        onDecline={() => {
          leaveStudy();
          onDone();
        }}
      />
    );
  return (
    <YesNoRun
      lang={lang}
      phase={step.phase}
      onFinish={(items, yes, seconds) => {
        const s = scoreTest(items, yes);
        const e = readEnrolment();
        h.logVocabTest?.(lang, {
          phase: step.phase,
          form: step.phase === "baseline" ? "A" : "B",
          arm: e ? e.arm : null,
          hits: s.hits,
          words: s.words,
          false_alarms: s.falseAlarms,
          pseudowords: s.pseudowords,
          known: Math.round(s.known * 10) / 10,
          day: e ? Math.max(0, Math.floor((Date.now() - e.at) / DAY_MS)) : 0,
          seconds: Math.min(3600, Math.round(seconds)),
        });
        markTaken(step.phase);
        onDone();
      }}
      onSkip={onDone}
    />
  );
}

function Disclosure({ onJoin, onDecline }: { onJoin: () => void; onDecline: () => void }) {
  return (
    <section className="flex flex-col gap-3 border border-[color:var(--hairline)] p-4" data-testid="study-disclosure">
      <h2 className="font-display uppercase text-[1.1rem] text-[color:var(--basalt)]">a study on reading time</h2>
      <p className="text-[14px] text-[color:var(--basalt-2)]">
        Polingual is testing how much of each session should go to reading and listening. If you take part, the app picks one of three settings for you at random, gives you a 3 minute word test now and another around day 28, and stores your study logs with the setting you got. Your logs stay tied to your account and are used only for this study and for Polingual itself.
      </p>
      <p className="text-[14px] text-[color:var(--basalt-2)]">You can leave at any time from this page, and your sessions go back to the usual mix.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={BTN_PRIMARY} onClick={onJoin} data-testid="study-join">
          take part
        </button>
        <button type="button" className={BTN_SECONDARY} onClick={onDecline} data-testid="study-decline">
          no thanks
        </button>
      </div>
    </section>
  );
}

function YesNoRun({ lang, phase, onFinish, onSkip }: { lang: string; phase: Phase; onFinish: (items: TestItem[], yes: Set<string>, seconds: number) => void; onSkip: () => void }) {
  const [forms, setForms] = useState<YesNoForms | null | "loading">("loading");
  const [at, setAt] = useState(0);
  const [yes, setYes] = useState<Set<string>>(new Set());
  const [started] = useState(() => Date.now());
  useEffect(() => {
    let live = true;
    loadYesNoForms(lang).then((f) => live && setForms(f));
    return () => {
      live = false;
    };
  }, [lang]);
  const items = useMemo(() => (forms && forms !== "loading" ? (phase === "baseline" ? forms.A : forms.B) : []), [forms, phase]);
  if (forms === "loading") return null;
  if (!forms || !items.length) return null;
  const answer = (known: boolean) => {
    const next = new Set(yes);
    if (known) next.add(items[at].word);
    if (at + 1 >= items.length) onFinish(items, next, (Date.now() - started) / 1000);
    else {
      setYes(next);
      setAt(at + 1);
    }
  };
  return (
    <section className="flex flex-col gap-3 border border-[color:var(--hairline)] p-4" data-testid="yes-no-test">
      <p className="text-[12px] text-[color:var(--basalt-3)] [font-variant-numeric:tabular-nums]">
        word test · {at + 1} / {items.length}
      </p>
      <p className="text-[14px] text-[color:var(--basalt-2)]">Do you know this word? Some of these are made up, so say no if you are not sure.</p>
      <p lang={lang} className="font-display text-[2rem] text-[color:var(--basalt)]" data-testid="yes-no-word">
        {items[at].word}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={BTN_PRIMARY} onClick={() => answer(true)} data-testid="yes-no-yes">
          I know it
        </button>
        <button type="button" className={BTN_SECONDARY} onClick={() => answer(false)} data-testid="yes-no-no">
          no
        </button>
      </div>
      <div className="flex flex-wrap gap-4 text-[12px] text-[color:var(--basalt-3)]">
        <button type="button" className="underline underline-offset-4" onClick={onSkip}>
          later
        </button>
        <button
          type="button"
          className="underline underline-offset-4"
          onClick={() => {
            leaveStudy();
            onSkip();
          }}
          data-testid="study-leave"
        >
          leave the study
        </button>
      </div>
    </section>
  );
}

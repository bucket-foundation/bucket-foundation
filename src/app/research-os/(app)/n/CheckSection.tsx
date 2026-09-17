"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Section from "./Section";
import type { NodeData, Quote } from "./types";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/ui";

type Verdict = "support" | "contradiction";
const CONFIDENCE: { v: string; label: string }[] = [
  { v: "not_sure", label: "not sure" },
  { v: "a_little", label: "a little" },
  { v: "fairly", label: "fairly" },
  { v: "certain", label: "certain" },
];
interface CheckResponse {
  attemptId?: string;
  forcingRequired?: boolean;
  result?: "support" | "contradiction" | "unknown";
  confidence?: string;
  feedback?: string;
  stage?: string;
  predictionCorrect?: boolean | null;
  error?: string;
  message?: string;
  needsProfile?: boolean;
}

/** Understanding, in place: explain the node in your own words and check it against what you quoted. */
export default function CheckSection({ data, quotes, onChanged }: { data: NodeData; quotes: Quote[]; onChanged: () => void }) {
  const [explanation, setExplanation] = useState("");
  const [verdict, setVerdict] = useState<Verdict>("support");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [confidence, setConfidence] = useState("fairly");
  const [prediction, setPrediction] = useState("");
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; profile?: boolean } | null>(null);

  async function post(body: Record<string, unknown>): Promise<CheckResponse | null> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/research-os/workspace", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "check", nodeId: data.node.id, ...body }) });
      const j = (await res.json().catch(() => ({}))) as CheckResponse;
      if (!res.ok) {
        setError({ text: j.message ?? j.error ?? "Check failed.", profile: Boolean(j.needsProfile) });
        return null;
      }
      return j;
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!explanation.trim()) return;
    const j = await post({ explanation, verdict, quotes: quotes.map((q) => ({ quotable_span: q.quotable_span, citation: q.citation })) });
    if (!j) return;
    if (j.attemptId && j.forcingRequired) {
      setAttemptId(j.attemptId);
      return;
    }
    setResult(j);
    onChanged();
  }

  async function reveal(e: FormEvent) {
    e.preventDefault();
    if (!attemptId) return;
    const j = await post({ attemptId, learnerConfidence: confidence, sourcePrediction: prediction, explanation, verdict, quotes: quotes.map((q) => ({ quotable_span: q.quotable_span, citation: q.citation })) });
    if (!j) return;
    setResult(j);
    setAttemptId(null);
    onChanged();
  }

  const held = data.standing.stage && ["understanding", "internalization", "production"].includes(data.standing.stage);

  return (
    <Section id="check" level="understanding" title="check" meta={held ? "held" : quotes.length ? `${quotes.length} quote${quotes.length === 1 ? "" : "s"} to check against` : "quote a source first"}>
      {!data.signedIn ? (
        <p className="text-[12px] text-[color:var(--basalt-3)]">Sign in to check an explanation.</p>
      ) : result ? (
        <div className="flex flex-col gap-2">
          <p className={"text-[14px] " + (result.result === "support" ? "text-[color:var(--laurel-deep)]" : "text-[color:var(--basalt)]")}>
            {result.result === "support" ? "Supported by what you quoted." : result.result === "contradiction" ? "The quotes contradict it." : "Could not be decided from what you quoted."}
            {result.stage ? ` Standing: ${result.stage}.` : ""}
            {result.predictionCorrect === true ? " Your source prediction was right." : result.predictionCorrect === false ? " Your source prediction missed." : ""}
          </p>
          {result.feedback && <p className="text-[13px] leading-[1.6] text-[color:var(--basalt-2)]">{result.feedback}</p>}
          <button type="button" onClick={() => { setResult(null); setExplanation(""); }} className={BTN_SECONDARY + " self-start"}>
            check another explanation
          </button>
        </div>
      ) : attemptId ? (
        <form onSubmit={reveal} className="flex flex-col gap-3 max-w-[60ch]">
          <p className="text-[13px] text-[color:var(--basalt-2)]">Before the verdict shows: how sure are you, and which source do you expect to decide it?</p>
          <div role="group" aria-label="Confidence" className="flex flex-wrap gap-2">
            {CONFIDENCE.map((c) => (
              <button key={c.v} type="button" onClick={() => setConfidence(c.v)} className={"text-[12px] small-caps px-3 py-1.5 border rounded-sm " + (confidence === c.v ? "border-[color:var(--gold-deep)] text-[color:var(--basalt)]" : "border-[color:var(--hairline)] text-[color:var(--basalt-3)]")}>
                {c.label}
              </button>
            ))}
          </div>
          <input value={prediction} onChange={(e) => setPrediction(e.target.value)} placeholder="the source you expect to decide it" className="border border-[color:var(--hairline)] px-3 py-2 text-[13px] bg-white/60" />
          <button type="submit" disabled={busy || !prediction.trim()} className={BTN_PRIMARY + " self-start"}>
            {busy ? "checking" : "show the verdict"}
          </button>
        </form>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3 max-w-[68ch]">
          <label htmlFor="check-explanation" className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">in your own words</label>
          <textarea id="check-explanation" value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={4} placeholder={`Explain "${data.node.title}" as you understand it.`} className="border border-[color:var(--hairline)] px-3 py-2 text-[14px] leading-[1.6] bg-white/60" />
          <div className="flex flex-wrap items-center gap-3 text-[13px] text-[color:var(--basalt-2)]">
            <span>What you quoted</span>
            {(["support", "contradiction"] as Verdict[]).map((v) => (
              <label key={v} className="inline-flex items-center gap-1">
                <input type="radio" name="verdict" checked={verdict === v} onChange={() => setVerdict(v)} />
                {v === "support" ? "supports it" : "contradicts it"}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={busy || !explanation.trim()} className={BTN_PRIMARY}>
              {busy ? "checking" : "check it"}
            </button>
            {quotes.length === 0 && <span className="text-[12px] text-[color:var(--basalt-3)]">Quote the source above so the check has something to read.</span>}
          </div>
          {error && (
            <p className="text-[12px] text-[color:var(--crimson)]">
              {error.text}{" "}
              {error.profile && (
                <Link href="/research-os/profile" className="underline underline-offset-4">
                  finish your profile
                </Link>
              )}
            </p>
          )}
        </form>
      )}
    </Section>
  );
}

"use client";

// LabBrain client island — drives the uniform job lifecycle through the
// same-origin proxy /api/research/labbrain:
//   submit  → POST  /api/research/labbrain          { author, question }
//   poll    → GET   /api/research/labbrain?job=<id>
//   result  → GET   /api/research/labbrain?job=<id>&result=1
// Render is "json" for LabBrain → typed view (answer + "Publish to canon").
// See docs/research-tools/04-implementation-architecture.md §2 + §7.

import { useCallback, useRef, useState } from "react";

type Phase = "idle" | "submitting" | "running" | "done" | "error";

type LabBrainOutput = { author: string; question: string; answer: string };
type ResultEnvelope = {
  job_id: string;
  tool: string;
  render: "json" | "html";
  output: LabBrainOutput;
  canon_candidate?: boolean;
  canon_tier?: string;
};

const POLL_FAST_MS = 1000;
const POLL_SLOW_MS = 3000;
const POLL_FAST_WINDOW_MS = 10_000;
const POLL_CAP_MS = 120_000;

export default function LabBrainClient() {
  const [author, setAuthor] = useState("");
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [statusText, setStatusText] = useState("");
  const [result, setResult] = useState<ResultEnvelope | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const startedRef = useRef(0);

  const fetchResult = useCallback(async (jobId: string) => {
    const r = await fetch(`/api/research/labbrain?job=${encodeURIComponent(jobId)}&result=1`);
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e?.error?.message ?? `result fetch failed (${r.status})`);
    }
    const data: ResultEnvelope = await r.json();
    setResult(data);
    setPhase("done");
    setStatusText("");
  }, []);

  const poll = useCallback(
    async (jobId: string) => {
      const elapsed = Date.now() - startedRef.current;
      if (elapsed > POLL_CAP_MS) {
        setPhase("error");
        setErrorMsg("Timed out waiting for the result. Try again.");
        return;
      }
      let r: Response;
      try {
        r = await fetch(`/api/research/labbrain?job=${encodeURIComponent(jobId)}`);
      } catch {
        setPhase("error");
        setErrorMsg("Lost connection to the tools backend.");
        return;
      }
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        setPhase("error");
        setErrorMsg(e?.error?.message ?? `status fetch failed (${r.status})`);
        return;
      }
      const s = await r.json();
      if (s.status === "succeeded") {
        await fetchResult(jobId).catch((err: Error) => {
          setPhase("error");
          setErrorMsg(err.message);
        });
        return;
      }
      if (s.status === "failed") {
        setPhase("error");
        setErrorMsg(s?.error?.message ?? "the run failed");
        return;
      }
      setStatusText(s.status === "running" ? "Reading the corpus…" : "Queued…");
      const next = elapsed < POLL_FAST_WINDOW_MS ? POLL_FAST_MS : POLL_SLOW_MS;
      setTimeout(() => void poll(jobId), next);
    },
    [fetchResult],
  );

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setResult(null);
      setErrorMsg("");
      setPhase("submitting");
      setStatusText("Submitting…");
      startedRef.current = Date.now();

      let r: Response;
      try {
        r = await fetch("/api/research/labbrain", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ author: author.trim(), question: question.trim() }),
        });
      } catch {
        setPhase("error");
        setErrorMsg("Could not reach the tools backend.");
        return;
      }
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setPhase("error");
        setErrorMsg(err?.error?.message ?? `submit failed (${r.status})`);
        return;
      }
      const data = await r.json();
      // Fast path: gateway may attach the result on the submit response.
      if (data.status === "succeeded" && data.result) {
        setResult(data.result as ResultEnvelope);
        setPhase("done");
        setStatusText("");
        return;
      }
      setPhase("running");
      setStatusText("Building the lab corpus…");
      void poll(data.job_id);
    },
    [author, question, poll],
  );

  const busy = phase === "submitting" || phase === "running";

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            research PI
          </span>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="e.g. Gerhard Hummer"
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[15px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)]"
            disabled={busy}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            question
          </span>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="How is free energy reconstructed from pulling experiments?"
            rows={3}
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[15px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] resize-y"
            disabled={busy}
          />
        </label>
        <button
          type="submit"
          disabled={busy || author.trim().length < 2 || question.trim().length < 5}
          className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
        >
          {busy ? "running…" : "ask the corpus"}
        </button>
      </form>

      {busy && (
        <div className="mt-8 text-[14px] text-[color:var(--basalt-2)] flex items-center gap-3">
          <span className="inline-block w-3 h-3 rounded-full bg-[color:var(--gold)] animate-pulse" />
          {statusText}
        </div>
      )}

      {phase === "error" && (
        <div className="mt-8 border border-[color:var(--hairline)] bg-[color:var(--bone)] p-5 text-[14px] text-[color:var(--basalt)]">
          <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-2">
            could not complete
          </div>
          {errorMsg}
        </div>
      )}

      {phase === "done" && result && (
        <ResultView result={result} />
      )}
    </div>
  );
}

function ResultView({ result }: { result: ResultEnvelope }) {
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState("");

  const onPublish = useCallback(async () => {
    setPublishing(true);
    setPublishMsg("");
    // [PUBLISH-TO-CANON HOOK — TODO backend wiring]
    // POST the job to the publish endpoint, which renders the canonical
    // artifact + provenance and registers it with its feed402/0.2 cite-forever
    // block (free-to-read, paid-to-cite over x402). No minting, no chain. See
    // docs §5. Endpoint not built in this slice.
    //   await fetch("/api/research/labbrain/publish", {
    //     method: "POST",
    //     headers: { "content-type": "application/json" },
    //     body: JSON.stringify({ job_id: result.job_id }),
    //   });
    setTimeout(() => {
      setPublishing(false);
      setPublishMsg(
        "Publish-to-canon registers the artifact + its feed402 cite-forever block — backend hook lands with the full gateway.",
      );
    }, 400);
  }, []);

  return (
    <div className="mt-10 border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6 md:p-8">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-2">
        answer · {result.output.author}
      </div>
      <div className="text-[15px] leading-[1.8] text-[color:var(--basalt)] whitespace-pre-wrap">
        {result.output.answer}
      </div>

      <div className="carved-rule max-w-xs mt-8 mb-6" />

      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={onPublish}
          disabled={publishing || !result.canon_candidate}
          className="font-display uppercase text-[13px] tracking-[0.06em] px-5 py-2.5 border border-[color:var(--basalt)] text-[color:var(--basalt)] disabled:opacity-50 hover:bg-[color:var(--basalt)] hover:text-[color:var(--bone)] transition-colors"
        >
          {publishing ? "publishing…" : "publish to canon"}
        </button>
        {result.canon_tier && (
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            tier: {result.canon_tier}
          </span>
        )}
      </div>
      {publishMsg && (
        <p className="mt-4 text-[13px] text-[color:var(--basalt-2)]">{publishMsg}</p>
      )}
    </div>
  );
}

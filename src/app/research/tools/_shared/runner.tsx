"use client";

import { useCallback, useRef, useState } from "react";
import { ToolOfflineNotice, detectToolOffline } from "./ToolOfflineNotice";

export type Phase = "idle" | "submitting" | "running" | "done" | "error";

export type ResultEnvelope = {
  job_id: string;
  tool: string;
  render: "json" | "html";
  output: unknown;
  artifacts?: Array<{ name: string; media_type?: string; url?: string }>;
  canon_candidate?: boolean;
  canon_tier?: string;
  demo?: boolean;
};

const POLL_FAST_MS = 1000;
const POLL_SLOW_MS = 3000;
const POLL_FAST_WINDOW_MS = 10_000;
const POLL_CAP_MS = 600_000;

export function useToolRun(tool: string) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [statusText, setStatusText] = useState("");
  const [result, setResult] = useState<ResultEnvelope | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const startedRef = useRef(0);

  const base = `/api/research/${tool}`;

  const fetchResult = useCallback(
    async (jobId: string) => {
      const r = await fetch(`${base}?job=${encodeURIComponent(jobId)}&result=1`);
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e?.error?.message ?? `result fetch failed (${r.status})`);
      }
      const data: ResultEnvelope = await r.json();
      setResult(data);
      setPhase("done");
      setStatusText("");
    },
    [base],
  );

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
        r = await fetch(`${base}?job=${encodeURIComponent(jobId)}`);
      } catch {
        setPhase("error");
        setErrorStatus(null);
        setErrorMsg("Lost connection to the tools backend.");
        return;
      }
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        setPhase("error");
        setErrorStatus(r.status);
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
      setStatusText(s.status === "running" ? "Running…" : "Queued…");
      const next = elapsed < POLL_FAST_WINDOW_MS ? POLL_FAST_MS : POLL_SLOW_MS;
      setTimeout(() => void poll(jobId), next);
    },
    [base, fetchResult],
  );

  const submit = useCallback(
    async (init: RequestInit, runningText = "Running…") => {
      setResult(null);
      setErrorMsg("");
      setErrorStatus(null);
      setPhase("submitting");
      setStatusText("Submitting…");
      startedRef.current = Date.now();

      let r: Response;
      try {
        r = await fetch(base, { method: "POST", ...init });
      } catch {
        setPhase("error");
        setErrorStatus(null);
        setErrorMsg("Could not reach the tools backend.");
        return;
      }
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setPhase("error");
        setErrorStatus(r.status);
        setErrorMsg(err?.error?.message ?? `submit failed (${r.status})`);
        return;
      }
      const data = await r.json();
      if (data.status === "succeeded" && data.result) {
        setResult(data.result as ResultEnvelope);
        setPhase("done");
        setStatusText("");
        return;
      }
      if (data.status === "failed") {
        setPhase("error");
        setErrorMsg(data?.error?.message ?? "the run failed");
        return;
      }
      setPhase("running");
      setStatusText(runningText);
      void poll(data.job_id);
    },
    [base, poll],
  );

  const busy = phase === "submitting" || phase === "running";
  return { phase, busy, statusText, result, errorMsg, errorStatus, submit };
}

export function RunStatus({ busy, statusText }: { busy: boolean; statusText: string }) {
  if (!busy) return null;
  return (
    <div className="mt-8 text-[14px] text-[color:var(--basalt-2)] flex items-center gap-3">
      <span className="inline-block w-3 h-3 rounded-full bg-[color:var(--gold)] animate-pulse" />
      {statusText}
    </div>
  );
}

export function RunError({
  phase,
  errorMsg,
  errorStatus = null,
  founderGpu = false,
  toolName,
}: {
  phase: Phase;
  errorMsg: string;
  errorStatus?: number | null;
  founderGpu?: boolean;
  toolName?: string;
}) {
  if (phase !== "error") return null;
  if (founderGpu && detectToolOffline(errorStatus, errorMsg)) {
    return <ToolOfflineNotice toolName={toolName} />;
  }
  return (
    <div className="mt-8 border border-[color:var(--hairline)] bg-[color:var(--bone)] p-5 text-[14px] text-[color:var(--basalt)]">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-2">
        could not complete
      </div>
      {errorMsg}
    </div>
  );
}

export function HtmlReport({ html }: { html: string }) {
  return (
    <iframe
      title="tool report"
      srcDoc={html}
      sandbox="allow-popups allow-same-origin"
      className="w-full min-h-[680px] bg-white border border-[color:var(--hairline)]"
    />
  );
}

export function PublishToCanon({ result }: { result: ResultEnvelope }) {
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState("");

  const onPublish = useCallback(async () => {
    setPublishing(true);
    setPublishMsg("");
    setTimeout(() => {
      setPublishing(false);
      setPublishMsg(
        "Publish-to-canon registers the artifact + its feed402 cite-forever block — backend hook lands with the full gateway.",
      );
    }, 400);
  }, []);

  return (
    <div>
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
        {result.demo && (
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--gold-deep,var(--basalt-3))]">
            demo output
          </span>
        )}
      </div>
      {publishMsg && (
        <p className="mt-4 text-[13px] text-[color:var(--basalt-2)]">{publishMsg}</p>
      )}
    </div>
  );
}

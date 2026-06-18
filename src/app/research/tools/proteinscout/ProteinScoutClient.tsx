"use client";

import { useState } from "react";
import {
  HtmlReport,
  PublishToCanon,
  RunError,
  RunStatus,
  useToolRun,
} from "../_shared/runner";

export default function ProteinScoutClient() {
  const [input, setInput] = useState("");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("proteinscout");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(
      {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: input.trim() }),
      },
      "Analyzing the sequence…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            sequence or UniProt accession
          </span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="MKTAYIAKQR... or P0DTC2"
            rows={4}
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[15px] font-mono text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] resize-y"
            disabled={busy}
          />
        </label>
        <button
          type="submit"
          disabled={busy || input.trim().length < 1}
          className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
        >
          {busy ? "running…" : "analyze"}
        </button>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && result.render === "html" && (
        <div className="mt-10">
          <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-3">
            per-residue report
          </div>
          <HtmlReport html={result.output as string} />
          <PublishToCanon result={result} />
        </div>
      )}
    </div>
  );
}

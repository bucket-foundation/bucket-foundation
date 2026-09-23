"use client";

import { useState } from "react";
import {
  HtmlReport,
  PublishToCanon,
  RunError,
  RunStatus,
  useToolRun,
} from "../_shared/runner";
import { FieldLabel } from "../_shared/FieldLabel";
import { SubmitButton } from "../_shared/SubmitButton";

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
          <FieldLabel>
            sequence or UniProt accession
          </FieldLabel>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="MKTAYIAKQR... or P0DTC2"
            rows={4}
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[15px] font-mono text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] resize-y"
            disabled={busy}
          />
        </label>
        <SubmitButton disabled={busy || input.trim().length < 1}>
          {busy ? "running…" : "analyze"}
        </SubmitButton>
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

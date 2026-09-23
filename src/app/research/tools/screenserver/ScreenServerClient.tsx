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

export default function ScreenServerClient() {
  const [smiles, setSmiles] = useState("");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("screenserver");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(
      {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ smiles: smiles.trim() }),
      },
      "Screening the library…",
    );
  };

  const n = smiles.split(/[\n,]/).map((s) => s.trim()).filter(Boolean).length;

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <FieldLabel>
            SMILES library {n > 0 && <span className="text-[color:var(--basalt-2)]">· {n} mol</span>}
          </FieldLabel>
          <textarea
            value={smiles}
            onChange={(e) => setSmiles(e.target.value)}
            placeholder={"CCO\nc1ccccc1\nCC(=O)Oc1ccccc1C(=O)O"}
            rows={6}
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[15px] font-mono text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] resize-y"
            disabled={busy}
          />
        </label>
        <SubmitButton disabled={busy || n < 1 || n > 200}>
          {busy ? "running…" : "screen"}
        </SubmitButton>
        {n > 200 && (
          <p className="text-[13px] text-[color:var(--basalt-2)]">Max 200 molecules per request.</p>
        )}
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && result.render === "html" && (
        <div className="mt-10">
          <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-3">
            ADMET screen report
          </div>
          <HtmlReport html={result.output as string} />
          <PublishToCanon result={result} />
        </div>
      )}
    </div>
  );
}

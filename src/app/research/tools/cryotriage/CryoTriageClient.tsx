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

export default function CryoTriageClient() {
  const [file, setFile] = useState<File | null>(null);
  const { phase, busy, statusText, result, errorMsg, errorStatus, submit } =
    useToolRun("cryotriage");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    if (file) fd.append("file", file);
    void submit(
      { body: fd },
      file ? "Triaging the micrograph…" : "Generating + triaging a synthetic session…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <FieldLabel>
            micrograph (.png / .mrc) — optional, leave blank for a synthetic session
          </FieldLabel>
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.mrc,.tif,.tiff"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-[14px] text-[color:var(--basalt-2)] file:mr-4 file:border file:border-[color:var(--hairline)] file:bg-[color:var(--bone)] file:px-4 file:py-2 file:text-[color:var(--basalt)] file:small-caps file:tracking-[0.1em]"
            disabled={busy}
          />
        </label>
        <SubmitButton disabled={busy}>
          {busy ? "running…" : file ? "triage micrograph" : "run synthetic session"}
        </SubmitButton>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError
        phase={phase}
        errorMsg={errorMsg}
        errorStatus={errorStatus}
        founderGpu
        toolName="CryoTriage"
      />

      {phase === "done" && result && result.render === "html" && (
        <div className="mt-10">
          <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-3">
            session triage report
          </div>
          <HtmlReport html={result.output as string} />
          <PublishToCanon result={result} />
        </div>
      )}
    </div>
  );
}

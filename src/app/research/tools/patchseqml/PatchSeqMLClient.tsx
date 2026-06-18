"use client";

import { useState } from "react";
import {
  HtmlReport,
  PublishToCanon,
  RunError,
  RunStatus,
  useToolRun,
} from "../_shared/runner";

export default function PatchSeqMLClient() {
  const [file, setFile] = useState<File | null>(null);
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("patchseqml");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    if (file) {
      fd.append("file", file);
      fd.append("mode", "file");
    } else {
      fd.append("mode", "sim");
    }
    // multipart: no content-type header — the browser sets the boundary.
    void submit(
      { body: fd },
      file ? "Analyzing the recording…" : "Running the Hodgkin-Huxley simulation…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            recording (.abf / .nwb) — optional, leave blank for the HH simulation
          </span>
          <input
            type="file"
            accept=".abf,.nwb,.h5"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-[14px] text-[color:var(--basalt-2)] file:mr-4 file:border file:border-[color:var(--hairline)] file:bg-[color:var(--bone)] file:px-4 file:py-2 file:text-[color:var(--basalt)] file:small-caps file:tracking-[0.1em]"
            disabled={busy}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
        >
          {busy ? "running…" : file ? "analyze recording" : "run simulation"}
        </button>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && result.render === "html" && (
        <div className="mt-10">
          <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-3">
            ephys analysis report
          </div>
          <HtmlReport html={result.output as string} />
          <PublishToCanon result={result} />
        </div>
      )}
    </div>
  );
}

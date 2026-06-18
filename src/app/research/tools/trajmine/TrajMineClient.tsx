"use client";

import { useState } from "react";
import {
  HtmlReport,
  PublishToCanon,
  RunError,
  RunStatus,
  useToolRun,
} from "../_shared/runner";

type Demo = "md" | "static";

export default function TrajMineClient() {
  const [demo, setDemo] = useState<Demo>("md");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("trajmine");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ demo }) },
      "Building the mechanism report…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            demo trajectory
          </span>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setDemo("md")}
              disabled={busy}
              className={`text-[12px] small-caps tracking-[0.12em] px-4 py-2 border transition-colors ${
                demo === "md"
                  ? "border-[color:var(--gold)] text-[color:var(--basalt)] bg-[color:var(--bone)]"
                  : "border-[color:var(--hairline)] text-[color:var(--basalt-3)]"
              }`}
            >
              alanine dipeptide (full MSM)
            </button>
            <button
              type="button"
              onClick={() => setDemo("static")}
              disabled={busy}
              className={`text-[12px] small-caps tracking-[0.12em] px-4 py-2 border transition-colors ${
                demo === "static"
                  ? "border-[color:var(--gold)] text-[color:var(--basalt)] bg-[color:var(--bone)]"
                  : "border-[color:var(--hairline)] text-[color:var(--basalt-3)]"
              }`}
            >
              ubiquitin NMR ensemble (static)
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
        >
          {busy ? "running…" : "run demo"}
        </button>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && result.render === "html" && (
        <div className="mt-10">
          <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-3">
            mechanism report
          </div>
          <HtmlReport html={result.output as string} />
          <PublishToCanon result={result} />
        </div>
      )}
    </div>
  );
}

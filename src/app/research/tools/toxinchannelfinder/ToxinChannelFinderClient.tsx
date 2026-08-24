"use client";

// ToxinChannelFinder client island, toxin/peptide → ranked ion-channel targets
// via curated KB + live OpenAlex co-occurrence. Render is "json" → typed view.

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

type Exemplar = { title: string; year: number | null; cited_by_count: number; url: string };
type Target = {
  rank: number;
  channel: string;
  channel_name: string;
  confidence: number;
  basis: string;
  from_families: string[];
  literature_mentions: number;
  exemplars: Exemplar[];
};
type Family = {
  family: string;
  source: string;
  canonical_targets: string[];
  sequence_match_score?: number;
};
type ToxinOutput = {
  input: string;
  identity: { mode: string; name?: string; length?: number; cysteine_count?: number };
  degraded?: boolean;
  matched_families: Family[];
  n_targets?: number;
  targets: Target[];
  message?: string;
  note?: string;
};

export default function ToxinChannelFinderClient() {
  const [toxin, setToxin] = useState("");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("toxinchannelfinder");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(
      {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ toxin: toxin.trim(), limit: 10 }),
      },
      "Mapping channel targets…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            toxin name or amino-acid sequence
          </span>
          <input
            value={toxin}
            onChange={(e) => setToxin(e.target.value)}
            placeholder="omega-conotoxin MVIIA  ·  apamin  ·  CKGKGAKCSRLMYDCCTGSCRSGKC"
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[15px] text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)]"
            disabled={busy}
          />
        </label>
        <button
          type="submit"
          disabled={busy || toxin.trim().length < 3}
          className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
        >
          {busy ? "mapping…" : "find channel targets"}
        </button>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <ToxinView result={result} />}
    </div>
  );
}

function ToxinView({ result }: { result: ResultEnvelope }) {
  const out = result.output as ToxinOutput;

  if (!out.targets || out.targets.length === 0) {
    return (
      <div className="mt-10 border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6">
        <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-2">
          no target inferred
        </div>
        <p className="text-[14px] text-[color:var(--basalt-2)]">{out.message}</p>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <div className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6 md:p-8">
        <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-2">
          identity{out.degraded ? " · degraded (no live literature)" : ""}
        </div>
        <p className="text-[16px] text-[color:var(--basalt)]">
          {out.identity.mode === "sequence"
            ? `Peptide sequence · ${out.identity.length} aa · ${out.identity.cysteine_count} cysteines`
            : `Named toxin · ${out.identity.name}`}
        </p>
        {out.matched_families.length > 0 && (
          <div className="mt-3 flex flex-col gap-1">
            {out.matched_families.map((f, i) => (
              <div key={i} className="text-[12px] text-[color:var(--basalt-2)]">
                <span className="small-caps tracking-[0.1em] text-[color:var(--aegean-deep)]">
                  {f.family}
                </span>
                {f.sequence_match_score != null
                  ? ` · seq match ${f.sequence_match_score.toFixed(2)}`
                  : ""}{" "}
                — {f.source}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 small-caps tracking-[0.14em] text-[color:var(--aegean-deep)] mb-3">
        ranked channel targets
      </div>
      <div className="flex flex-col gap-px bg-[color:var(--hairline)]">
        {out.targets.map((t) => (
          <div key={t.rank} className="bg-[color:var(--bone)] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="font-display text-[18px] text-[color:var(--basalt)]">
                  {t.rank}. {t.channel}
                </span>
                <span className="ml-2 text-[13px] text-[color:var(--basalt-2)]">
                  {t.channel_name}
                </span>
              </div>
              <span className="shrink-0 text-[11px] small-caps tracking-[0.1em] text-[color:var(--basalt-3)]">
                conf {t.confidence.toFixed(2)}
              </span>
            </div>
            <div className="mt-1 text-[11px] small-caps tracking-[0.1em] text-[color:var(--basalt-3)]">
              {[
                t.basis,
                t.from_families.length ? `families: ${t.from_families.join(", ")}` : "",
                `${t.literature_mentions} lit. mentions`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
            {t.exemplars.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                {t.exemplars.map((e, i) => (
                  <a
                    key={i}
                    href={e.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12px] text-[color:var(--basalt-2)] hover:text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-2"
                  >
                    {e.title} {e.year ? `(${e.year})` : ""}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {out.note && (
        <p className="mt-6 text-[12px] leading-[1.6] text-[color:var(--basalt-3)]">{out.note}</p>
      )}

      <PublishToCanon result={result} />
    </div>
  );
}

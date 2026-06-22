"use client";

// MLReproCard client island — reproducibility rubric + model card over a
// described ML experiment. Render "json".

import { useState } from "react";
import {
  useToolRun,
  RunStatus,
  RunError,
  PublishToCanon,
  type ResultEnvelope,
} from "../_shared/runner";

type Gap = { check: string; dimension: string; weight: number; fix: string };
type MLReproOutput = {
  reproducibility_score: number;
  reproducibility_level: string;
  level_name: string;
  dimension_subscores: Record<string, number>;
  prioritized_gaps: Gap[];
  n_gaps: number;
  model_card: Record<string, Record<string, string>>;
  demo: boolean;
  note?: string;
};

const PLACEHOLDER = `{
  "model": "ResNet-50",
  "task": "image classification",
  "dataset": "ImageNet",
  "dataset_version": "ILSVRC2012",
  "splits": "1.28M train / 50k val",
  "seed": 42,
  "hyperparameters": {"lr": 0.1, "batch_size": 256, "optimizer": "SGD", "epochs": 90},
  "framework": "pytorch 2.5",
  "hardware": "8x A100",
  "compute_budget": "90 GPU-hours",
  "metrics": "top-1 76.1%",
  "code": "https://github.com/me/repro",
  "environment": "Dockerfile + requirements.txt",
  "license": "MIT"
}`;

export default function MLReproCardClient() {
  const [record, setRecord] = useState("");
  const { phase, busy, statusText, result, errorMsg, submit } = useToolRun("mlreprocard");

  const runDemo = () =>
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ demo: true }) },
      "Scoring demo experiment…",
    );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (record.trim().length < 2) return;
    void submit(
      { headers: { "content-type": "application/json" }, body: JSON.stringify({ record }) },
      "Scoring reproducibility…",
    );
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
            ML experiment (JSON object of fields)
          </span>
          <textarea
            value={record}
            onChange={(e) => setRecord(e.target.value)}
            placeholder={PLACEHOLDER}
            rows={12}
            className="bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 text-[13px] leading-[1.6] font-mono text-[color:var(--basalt)] outline-none focus:border-[color:var(--gold)] resize-y"
            disabled={busy}
          />
        </label>
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={busy || record.trim().length < 2}
            className="self-start font-display uppercase text-[14px] tracking-[0.06em] px-6 py-3 bg-[color:var(--basalt)] text-[color:var(--bone)] disabled:opacity-50 hover:bg-[color:var(--aegean-deep)] transition-colors"
          >
            {busy ? "scoring…" : "score reproducibility"}
          </button>
          <button
            type="button"
            onClick={runDemo}
            disabled={busy}
            className="text-[12px] small-caps tracking-[0.12em] text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4 disabled:opacity-50"
          >
            run a demo experiment
          </button>
        </div>
      </form>

      <RunStatus busy={busy} statusText={statusText} />
      <RunError phase={phase} errorMsg={errorMsg} />

      {phase === "done" && result && <MLReproView result={result} />}
    </div>
  );
}

function MLReproView({ result }: { result: ResultEnvelope }) {
  const out = result.output as MLReproOutput;
  return (
    <div className="mt-10">
      <div className="small-caps tracking-[0.14em] text-[color:var(--basalt-3)] mb-4">
        reproducibility assessment{out.demo ? " · DEMO" : ""}
      </div>

      <div className="border border-[color:var(--hairline)] bg-[color:var(--bone)] p-6 mb-6">
        <div className="flex items-baseline gap-4">
          <span className="text-[40px] font-display text-[color:var(--basalt)] leading-none">
            {out.reproducibility_score}
          </span>
          <span className="text-[14px] text-[color:var(--basalt-3)]">/ 100</span>
          <span className="ml-auto text-[28px] font-display inlay-gold">{out.reproducibility_level}</span>
        </div>
        <p className="mt-3 text-[14px] text-[color:var(--basalt-2)]">{out.level_name}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-[color:var(--hairline)]">
        {Object.entries(out.dimension_subscores).map(([dim, s]) => (
          <div key={dim} className="bg-[color:var(--bone)] p-4">
            <div className="text-[10px] small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-1">{dim}</div>
            <div className="text-[16px] font-display text-[color:var(--basalt)]">{s}</div>
          </div>
        ))}
      </div>

      {out.prioritized_gaps.length > 0 && (
        <div className="mt-8">
          <div className="small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-2">
            missing repro elements (highest leverage first)
          </div>
          <ol className="flex flex-col gap-3">
            {out.prioritized_gaps.slice(0, 12).map((g, i) => (
              <li key={i} className="text-[13px] leading-[1.6] text-[color:var(--basalt-2)] flex gap-3">
                <span className="font-mono text-[color:var(--aegean-deep)] shrink-0">
                  {g.check} (+{g.weight})
                </span>
                <span>{g.fix}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-8">
        <div className="small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-2">model card</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[color:var(--hairline)]">
          {Object.entries(out.model_card).map(([section, fields]) => (
            <div key={section} className="bg-[color:var(--bone)] p-4">
              <div className="text-[11px] small-caps tracking-[0.12em] text-[color:var(--basalt-3)] mb-2">
                {section.replace(/_/g, " ")}
              </div>
              <dl className="text-[12px] leading-[1.6]">
                {Object.entries(fields).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <dt className="text-[color:var(--basalt-3)] shrink-0">{k}:</dt>
                    <dd className="text-[color:var(--basalt-2)]">{v || "—"}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>

      {out.note && <p className="mt-6 text-[12px] leading-[1.7] text-[color:var(--basalt-3)]">{out.note}</p>}
      <PublishToCanon result={result} />
    </div>
  );
}

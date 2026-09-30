import type { Hit } from "@/lib/explore/search";
import { SOURCE_COLOR } from "@/lib/explore/modes/globe";

const LABEL = { paper: "Paper", text: "Text", talk: "Talk" } as const;
const OPEN = { paper: "Open paper", text: "Open text", talk: "Watch on YouTube" } as const;
const mono = { fontFamily: "var(--font-jetbrains)" };

export function isSourceHit(h: Hit): h is Hit & { type: "paper" | "text" | "talk" } {
  return h.type === "paper" || h.type === "text" || h.type === "talk";
}

export default function SourcePanel({ hit }: { hit: Hit }) {
  if (!isSourceHit(hit)) return null;
  return (
    <div data-testid={`source-panel-${hit.type}`} className="mt-3 text-sm">
      <p className="flex items-center gap-2 text-xs uppercase" style={{ ...mono, color: SOURCE_COLOR[hit.type] }}>
        <span style={{ width: 10, height: 10, borderRadius: 5, background: SOURCE_COLOR[hit.type], display: "inline-block" }} />
        {LABEL[hit.type]}
        {hit.year !== null && <span>{hit.year}</span>}
      </p>
      {(hit.source || hit.license) && (
        <p data-testid="source-license" className="mt-2" style={{ color: "var(--parchment-dim)" }}>
          {[hit.source, hit.license].filter(Boolean).join(" · ")}
        </p>
      )}
      {hit.url && (
        <a className="underline mt-2 inline-block" href={hit.url} target="_blank" rel="noreferrer">
          {OPEN[hit.type]}
        </a>
      )}
    </div>
  );
}

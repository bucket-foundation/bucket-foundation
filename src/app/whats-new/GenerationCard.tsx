export interface Generation {
  id: string;
  date: string;
  title: string;
  state: string;
  tool: string;
  run_id?: string;
  claim?: string;
  score?: { value: number; meaning: string };
  evidence?: string[];
  parent?: string;
}

export const STATE_LABEL: Record<string, string> = {
  candidate: "candidate, not yet tested",
  tested: "tested",
  refuted: "refuted",
  proved: "proved",
};

const STATE_NOTE: Record<string, string> = {
  candidate: "Nobody has tested this claim yet.",
  tested: "A test ran on this claim. The score below says what it found.",
  refuted: "A test ran on this claim and the claim failed. It stays here so the record is complete.",
  proved: "This claim has a proof.",
};

const STATE_TONE: Record<string, string> = {
  candidate: "text-[color:var(--parchment-dim)]",
  tested: "text-[color:var(--gold)]",
  refuted: "text-[color:var(--basalt)] line-through decoration-1",
  proved: "text-[color:var(--gold)]",
};

export default function GenerationCard({ generation, parentTitle, draftBy }: { generation: Generation; parentTitle?: string; draftBy?: string }) {
  const g = generation;
  const label = STATE_LABEL[g.state] ?? g.state;
  const refuted = g.state === "refuted";
  return (
    <article id={g.id} data-state={g.state} className="border hairline bg-[color:var(--bone-2)] p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2 small-caps text-[10px]">
        <span className="border hairline px-1.5 py-0.5 text-[color:var(--basalt)]">made by a machine</span>
        <span className={refuted ? "text-[color:var(--basalt)] font-semibold" : (STATE_TONE[g.state] ?? "")}>{label}</span>
        <span className="text-[color:var(--parchment-dim)]">· {g.date}</span>
        {draftBy && <span className="text-[color:var(--parchment-dim)]">· draft by {draftBy}, not published</span>}
      </div>
      <h3 className={`font-serif-display text-lg leading-snug mb-2 ${refuted ? STATE_TONE.refuted : "text-[color:var(--basalt)]"}`}>{g.title}</h3>
      {g.claim && <p className="text-sm leading-relaxed text-[color:var(--parchment)] mb-3">{g.claim}</p>}
      <p className="text-sm text-[color:var(--parchment-dim)] mb-3">{STATE_NOTE[g.state] ?? ""}</p>
      {g.score && (
        <p className="text-sm text-[color:var(--parchment-dim)] mb-3">
          Score <span className="text-[color:var(--basalt)] font-medium">{g.score.value}</span>: {g.score.meaning}
        </p>
      )}
      <p className="text-xs text-[color:var(--parchment-dim)] mb-3">Produced by {g.tool}</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 small-caps text-[10px]">
        {g.parent && parentTitle && (
          <li>
            <a href={`#${g.parent}`} className="text-[color:var(--gold)] hover:text-[color:var(--basalt)]">
              from {parentTitle}
            </a>
          </li>
        )}
        {(g.evidence ?? []).map((href, i) => (
          <li key={href}>
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-[color:var(--gold)] hover:text-[color:var(--basalt)]">
              evidence {i + 1} ↗
            </a>
          </li>
        ))}
      </ul>
    </article>
  );
}

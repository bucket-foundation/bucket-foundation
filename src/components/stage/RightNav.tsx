"use client";

import type { Hit } from "@/lib/explore/search";
import { toStageRecord } from "@/lib/stage/mappers";
import { groupEdges } from "@/lib/stage/links";

const mono = { fontFamily: "var(--font-jetbrains)" };
const dim = { color: "var(--parchment-dim)" };

interface Props {
  current: Hit | null;
  fallbackLabel: string | null;
  byId: Map<string, Hit>;
  onSelect(id: string): void;
}

export default function RightNav({ current, fallbackLabel, byId, onSelect }: Props) {
  if (!current) {
    return (
      <aside data-testid="explore-panel" className="p-4 text-sm">
        {fallbackLabel ?? "Select a result."}
      </aside>
    );
  }
  const record = toStageRecord(current);
  const { profile } = record;
  const groups = groupEdges(record.links);
  return (
    <aside data-testid="explore-panel" className="p-4 text-sm">
      <p className="text-xs uppercase" style={{ ...mono, ...dim }}>
        {profile.kicker}
        {profile.date ? ` · ${profile.date}` : ""}
      </p>
      <h2 className="text-lg mt-1">{profile.title}</h2>
      {profile.body && <p className="mt-3">{profile.body}</p>}
      {profile.links.map((l) => (
        <a key={l.url} className="underline mt-3 inline-block" href={l.url}>
          Open
        </a>
      ))}
      <section data-testid="right-nav-links" className="mt-5">
        <h3 className="text-xs uppercase" style={{ ...mono, ...dim }}>
          Links ({record.links.length})
        </h3>
        {groups.length === 0 && <p className="mt-1">No links.</p>}
        {groups.map((g) => (
          <div key={g.kind} className="mt-2">
            <p className="text-xs" style={{ ...mono, ...dim }}>
              {g.kind}
            </p>
            <ul className="mt-1 space-y-1">
              {g.edges.map((e) => (
                <li key={`${g.kind}:${e.to}`}>
                  <button className="underline text-left" onClick={() => onSelect(e.to)}>
                    {byId.get(e.to)?.title ?? e.to}
                  </button>
                  <span className="block text-xs" style={dim}>
                    {e.reason}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </aside>
  );
}

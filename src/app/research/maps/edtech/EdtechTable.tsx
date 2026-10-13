"use client";

import { useMemo, useState } from "react";
import { EFFICACY_LABEL, EFFICACY_ORDER, SEGMENT_LABEL, filterPlayers, type Player } from "@/lib/research-maps/edtech";

const CONTROL = "border border-[color:var(--hairline)] bg-[#FBF7EA] px-3 py-2 text-[14px] text-[color:var(--basalt)]";

export default function EdtechTable({ players, segments }: { players: Player[]; segments: { id: string; label: string }[] }) {
  const [segment, setSegment] = useState("");
  const [level, setLevel] = useState("");
  const [text, setText] = useState("");
  const rows = useMemo(() => filterPlayers(players, { segment, level, text }), [players, segment, level, text]);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select aria-label="Category" value={segment} onChange={(e) => setSegment(e.target.value)} className={CONTROL}>
          <option value="">All categories</option>
          {segments.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <select aria-label="Efficacy evidence" value={level} onChange={(e) => setLevel(e.target.value)} className={CONTROL}>
          <option value="">All evidence levels</option>
          {EFFICACY_ORDER.map((l) => (
            <option key={l} value={l}>
              {EFFICACY_LABEL[l]}
            </option>
          ))}
        </select>
        <input aria-label="Search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search name, learner, mechanism, price" className={`${CONTROL} min-w-[280px] flex-1`} />
        <span data-row-count className="font-mono text-[12px] text-[color:var(--basalt-3)]">
          {rows.length} of {players.length}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[13px] leading-[1.45] text-[color:var(--basalt-2)]">
          <thead>
            <tr className="small-caps border-b border-[color:var(--stone-carve)] text-[10px] text-[color:var(--basalt-3)]">
              {["Player", "Category", "Learner", "Mechanism", "Price", "Efficacy evidence"].map((h) => (
                <th key={h} className="px-2 py-2 align-bottom font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-[color:var(--hairline)] align-top">
                <td className="px-2 py-2 font-semibold text-[color:var(--basalt)]">{p.name}</td>
                <td className="px-2 py-2">{SEGMENT_LABEL[p.segment] ?? p.segment}</td>
                <td className="px-2 py-2">{p.learner}</td>
                <td className="px-2 py-2">{p.mechanism}</td>
                <td className="px-2 py-2">{p.price}</td>
                <td className="px-2 py-2">
                  <span className="font-semibold text-[color:var(--basalt)]">{EFFICACY_LABEL[p.efficacy.level]}.</span> {p.efficacy.finding}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

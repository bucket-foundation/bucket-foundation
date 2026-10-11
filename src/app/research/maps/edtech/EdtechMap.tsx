import { EFFICACY_LABEL, EFFICACY_ORDER, panelSpans, type EfficacyLevel, type Player, type Segment } from "@/lib/research-maps/edtech";
import { LegendItem } from "../MapFigure";

const DOT: Record<EfficacyLevel, React.CSSProperties> = {
  independent: { background: "var(--aegean)", border: "1.5px solid var(--aegean)" },
  company: { background: "var(--gold)", border: "1.5px solid var(--gold)" },
  "none-found": { background: "transparent", border: "1.5px solid var(--basalt-3)" },
  "not-searched": { background: "transparent", border: "1.5px dotted rgba(31,28,22,0.4)" },
};

function Dot({ level, size = 9 }: { level: EfficacyLevel; size?: number }) {
  return <span aria-hidden className="inline-block shrink-0 rounded-full" style={{ ...DOT[level], width: size, height: size }} />;
}

const shortName = (name: string): string => name.replace(/\s*\(.*\)\s*$/, "");

export function PlayerTile({ player }: { player: Player }) {
  const light = player.logo?.tone === "light";
  return (
    <div data-player={player.id} title={`${player.name}. ${EFFICACY_LABEL[player.efficacy.level]}.`} className="flex min-w-0 flex-col items-center gap-1">
      <div
        className="relative flex h-[60px] w-full items-center justify-center rounded-[3px] border px-2 py-2"
        style={{
          background: light ? "var(--basalt-2)" : "#FBF7EA",
          borderColor: "var(--hairline)",
          borderStyle: player.logo ? "solid" : "dashed",
        }}
      >
        {player.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.logo.src} alt={`${player.name} logo`} loading="eager" className="max-h-full max-w-full object-contain" />
        ) : (
          <span data-text-tile className="font-display text-center text-[10px] uppercase leading-[1.15] text-[color:var(--basalt-2)]">
            {shortName(player.name)}
          </span>
        )}
        <span className="absolute right-1 top-1 rounded-full" style={{ background: light ? "var(--basalt-2)" : "#FBF7EA", padding: 1, lineHeight: 0 }}>
          <Dot level={player.efficacy.level} size={8} />
        </span>
      </div>
      <div className="line-clamp-2 w-full text-center text-[10.5px] leading-[1.2] text-[color:var(--basalt-2)]">{player.name}</div>
    </div>
  );
}

export default function EdtechMap({ segments }: { segments: Segment[] }) {
  const spans = panelSpans(segments.map((s) => s.players.length)).flat();
  const counts = (level: EfficacyLevel) => segments.reduce((a, s) => a + s.players.filter((p) => p.efficacy.level === level).length, 0);
  const textTiles = segments.reduce((a, s) => a + s.players.filter((p) => !p.logo).length, 0);
  return (
    <div>
      <div data-map-legend className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="small-caps text-[10px] text-[color:var(--basalt-3)]">Efficacy evidence</span>
        {EFFICACY_ORDER.map((level) => (
          <LegendItem key={level} swatch={<Dot level={level} />} label={`${EFFICACY_LABEL[level]}, ${counts(level)}`} />
        ))}
        <LegendItem
          swatch={<span aria-hidden className="inline-block h-[12px] w-[20px] rounded-[2px] border border-dashed" style={{ borderColor: "rgba(31,28,22,0.4)" }} />}
          label={`Text tile where the site gave no logo, ${textTiles}`}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[repeat(24,minmax(0,1fr))]">
        {segments.map((s, i) => (
          <section
            key={s.id}
            data-segment={s.id}
            className="border border-[color:var(--hairline)] bg-[color:var(--bone-2)] p-3 lg:[grid-column:span_var(--span)]"
            style={{ "--span": spans[i] } as React.CSSProperties}
          >
            <h2 className="mb-3 flex items-baseline justify-between gap-2 border-b border-[color:var(--hairline)] pb-2">
              <span className="font-display text-[13px] uppercase tracking-[0.04em] text-[color:var(--basalt)]">{s.label}</span>
              <span className="font-mono text-[11px] text-[color:var(--basalt-3)]">{s.players.length}</span>
            </h2>
            <div className="grid gap-x-2 gap-y-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))" }}>
              {s.players.map((p) => (
                <PlayerTile key={p.id} player={p} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

import raw from "@/data/research-maps/edtech.json";
import manifest from "../../../public/research/maps/logos/manifest.json";
import { SEGMENT_LABEL, type EfficacyLevel, type Logo, type Player, type Segment } from "./edtech";

export type ManifestEntry = { file?: string; source_url?: string; tone?: string; kind?: string; site?: string; missing?: string };

export function logoFor(id: string, entries: Record<string, ManifestEntry> = manifest.logos as Record<string, ManifestEntry>): Logo | null {
  const e = entries[id];
  if (!e?.file || !e.source_url) return null;
  return { src: `/research/maps/logos/${e.file}`, sourceUrl: e.source_url, tone: e.tone === "light" ? "light" : "dark", kind: e.kind ?? "site-logo" };
}

export function loadEdtech(entries?: Record<string, ManifestEntry>): { date: string; source: string; players: Player[]; segments: Segment[]; logoCount: number } {
  const players = raw.players.map((p) => ({ ...p, efficacy: { ...p.efficacy, level: p.efficacy.level as EfficacyLevel }, logo: logoFor(p.id, entries) }));
  const ids = Array.from(new Set(players.map((p) => p.segment)));
  const segments = ids
    .map((id) => ({ id, label: SEGMENT_LABEL[id] ?? id, players: players.filter((p) => p.segment === id).sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => b.players.length - a.players.length || a.label.localeCompare(b.label));
  return { date: raw.date, source: raw.source, players, segments, logoCount: players.filter((p) => p.logo).length };
}

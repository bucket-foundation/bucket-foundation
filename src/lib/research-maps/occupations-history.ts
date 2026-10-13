import raw from "@/data/research-maps/occupations-history.json";

export type Family = "farm" | "manual" | "service" | "white";
export type LineageKind = "census_lineage" | "soc_oews" | "onet_soc";
export type SharePanel = { years: number[]; groups: { code: string; title: string; family: string; employment: number[] }[]; rows: number; measure: string };
export type YearCount = { year: number; kind: string; count: number };
export type ExtinctRow = { title: string; basis: string; first: number; peak: number; peakEmployment: number; last: number; lastEmployment: number; ratio: number; gone: boolean };
export type NewestRow = { title: string; scheme: string; first: number; employment: number | null; change: number | null };
export type OccupationsHistory = {
  date: string;
  source: string;
  counts: { titles: number; series: number };
  census: SharePanel;
  oews: SharePanel;
  lifecycle: {
    lineages: number;
    kinds: Record<string, number>;
    statuses: Record<string, number>;
    born: YearCount[];
    peaked: YearCount[];
    ended: YearCount[];
    extinctPool: number;
    extinct: ExtinctRow[];
    emergingPool: number;
    newest: NewestRow[];
  };
};

export const FAMILY_ORDER: Family[] = ["farm", "manual", "service", "white"];
export const FAMILY_LABEL: Record<Family, string> = { farm: "Farm", manual: "Manual", service: "Service", white: "White-collar" };
export const FAMILY_RAMP: Record<Family, [string, string]> = {
  farm: ["#55622A", "#A8B26E"],
  manual: ["#1F1C16", "#A39B88"],
  service: ["#8A6414", "#E0C27A"],
  white: ["#1F4F4F", "#A9CBC3"],
};
export const KIND_ORDER: LineageKind[] = ["census_lineage", "soc_oews", "onet_soc"];
export const KIND_LABEL: Record<LineageKind, string> = { census_lineage: "Census lineage", soc_oews: "OEWS lineage", onet_soc: "O*NET-SOC occupation" };
export const KIND_FILL: Record<LineageKind, string> = { census_lineage: "#1F1C16", soc_oews: "#2E6B6B", onet_soc: "#7FAFA6" };

export function loadOccupationsHistory(): OccupationsHistory {
  return raw as OccupationsHistory;
}

export function mix(from: string, to: string, t: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2].map((i) => Math.round(channel(from, i) + (channel(to, i) - channel(from, i)) * t));
  return "#" + out.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}

export type ShareBand = { code: string; title: string; family: Family; fill: string; shares: number[]; low: number[]; high: number[] };

export function shareBands(panel: SharePanel): ShareBand[] {
  const totals = panel.years.map((_, i) => panel.groups.reduce((a, g) => a + g.employment[i], 0));
  const ordered = FAMILY_ORDER.flatMap((family) => {
    const members = panel.groups.filter((g) => g.family === family);
    return members.map((g, i) => ({ g, family, fill: mix(FAMILY_RAMP[family][0], FAMILY_RAMP[family][1], members.length > 1 ? i / (members.length - 1) : 0.35) }));
  });
  const floor = panel.years.map(() => 0);
  return ordered.map(({ g, family, fill }) => {
    const shares = g.employment.map((v, i) => v / totals[i]);
    const low = floor.slice();
    shares.forEach((s, i) => {
      floor[i] += s;
    });
    return { code: g.code, title: g.title, family, fill, shares, low, high: floor.slice() };
  });
}

export function spread(wanted: number[], gap: number, lo: number, hi: number): number[] {
  const order = wanted.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  const placed = order.map((o) => o.y);
  for (let k = 0; k < placed.length; k++) placed[k] = Math.max(placed[k], k === 0 ? lo : placed[k - 1] + gap);
  for (let k = placed.length - 1; k >= 0; k--) placed[k] = Math.min(placed[k], k === placed.length - 1 ? hi : placed[k + 1] - gap);
  const out = wanted.slice();
  order.forEach((o, k) => {
    out[o.i] = placed[k];
  });
  return out;
}

export type StreamBand = ShareBand & { d: string; edgeY: number; labelY: number; first: number; last: number };
export type StreamLayout = { bands: StreamBand[]; x: (year: number) => number; y: (share: number) => number; years: number[] };

export function layoutStream(panel: SharePanel, box: { x: number; y: number; w: number; h: number }, labelSide: "left" | "right", gap = 13): StreamLayout {
  const bands = shareBands(panel);
  const first = panel.years[0];
  const last = panel.years[panel.years.length - 1];
  const x = (year: number) => box.x + ((year - first) / (last - first)) * box.w;
  const y = (share: number) => box.y + box.h - share * box.h;
  const edge = labelSide === "left" ? 0 : panel.years.length - 1;
  const mids = bands.map((b) => y((b.low[edge] + b.high[edge]) / 2));
  const labels = spread(mids, gap, box.y + 4, box.y + box.h - 2);
  return {
    x,
    y,
    years: panel.years,
    bands: bands.map((b, i) => {
      const top = panel.years.map((yr, k) => `${x(yr).toFixed(1)},${y(b.high[k]).toFixed(1)}`);
      const bottom = panel.years.map((yr, k) => `${x(yr).toFixed(1)},${y(b.low[k]).toFixed(1)}`).reverse();
      return { ...b, d: `M${top.join("L")}L${bottom.join("L")}Z`, edgeY: mids[i], labelY: labels[i], first: b.shares[0], last: b.shares[b.shares.length - 1] };
    }),
  };
}

export type StripColumn = { year: number; total: number; parts: { kind: LineageKind; count: number; y: number; h: number }[]; x: number; labelled: boolean };

export function layoutStrip(rows: YearCount[], x: (year: number) => number, baseline: number, height: number, labelFloor = 0.12): { columns: StripColumn[]; max: number } {
  const years = Array.from(new Set(rows.map((r) => r.year))).sort((a, b) => a - b);
  const totals = years.map((year) => rows.filter((r) => r.year === year).reduce((a, r) => a + r.count, 0));
  const max = Math.max(...totals, 1);
  const columns = years.map((year, i) => {
    let y = baseline;
    const parts = KIND_ORDER.flatMap((kind) => {
      const count = rows.filter((r) => r.year === year && r.kind === kind).reduce((a, r) => a + r.count, 0);
      if (!count) return [];
      const h = (count / max) * height;
      y -= h;
      return [{ kind, count, y, h }];
    });
    const near = years.map((other, k) => (k !== i && Math.abs(other - year) <= 3 ? totals[k] : 0));
    const labelled = totals[i] >= max * labelFloor && near.every((t, k) => t < totals[i] || (t === totals[i] && k > i));
    return { year, total: totals[i], parts, x: x(year), labelled };
  });
  return { columns, max };
}

export function logScale(lo: number, hi: number, x0: number, x1: number): (v: number) => number {
  return (v: number) => x0 + ((Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * (x1 - x0);
}

export const percent = (share: number, digits = 1): string => (share * 100).toFixed(digits);
export const clip = (text: string, max: number): string => (text.length <= max ? text : text.slice(0, max - 1).trimEnd() + "…");

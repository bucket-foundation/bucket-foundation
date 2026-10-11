import raw from "@/data/research-maps/flow.json";

export type FlowNode = { code: string; title: string; links: number; y: number; h: number };
export type FlowRibbon = { cip: string; soc: string; links: number; y0: number; y1: number; h: number; main: boolean; cipTitle: string; socTitle: string };
export type FlowLayout = { width: number; height: number; left: FlowNode[]; right: FlowNode[]; ribbons: FlowRibbon[]; nodeWidth: number; leftX: number; rightX: number };

export function loadFlow() {
  return raw;
}

function column(nodes: { code: string; title: string; links: number }[], unit: number, gap: number, minHeight: number): FlowNode[] {
  let y = 0;
  return [...nodes]
    .sort((a, b) => b.links - a.links || a.code.localeCompare(b.code))
    .map((n) => {
      const h = Math.max(n.links * unit, minHeight);
      const node = { ...n, y, h };
      y += h + gap;
      return node;
    });
}

export function layoutFlow(width = 1500, leftLabel = 470, rightLabel = 430): FlowLayout {
  const unit = 0.19;
  const gap = 12.5;
  const left = column(raw.cip, unit, gap, 3);
  const leftHeight = left.at(-1)!.y + left.at(-1)!.h;
  const rightGap = (leftHeight - raw.total * unit) / (raw.soc.length - 1);
  const right = column(raw.soc, unit, Math.max(rightGap, gap), 3);
  const height = Math.max(leftHeight, right.at(-1)!.y + right.at(-1)!.h);
  const leftAt = new Map(left.map((n) => [n.code, n]));
  const rightAt = new Map(right.map((n) => [n.code, n]));
  const order = (code: string, side: Map<string, FlowNode>) => side.get(code)!.y;
  const leftUsed = new Map<string, number>();
  const rightUsed = new Map<string, number>();
  const largest = new Map<string, number>();
  for (const l of raw.links) largest.set(l.cip, Math.max(largest.get(l.cip) ?? 0, l.links));
  const y0 = new Map<string, number>();
  for (const l of [...raw.links].sort((a, b) => order(a.cip, leftAt) - order(b.cip, leftAt) || order(a.soc, rightAt) - order(b.soc, rightAt))) {
    const node = leftAt.get(l.cip)!;
    const share = node.h / node.links;
    const used = leftUsed.get(l.cip) ?? 0;
    y0.set(`${l.cip}|${l.soc}`, node.y + used + (l.links * share) / 2);
    leftUsed.set(l.cip, used + l.links * share);
  }
  const ribbons: FlowRibbon[] = [];
  for (const l of [...raw.links].sort((a, b) => order(a.soc, rightAt) - order(b.soc, rightAt) || order(a.cip, leftAt) - order(b.cip, leftAt))) {
    const node = rightAt.get(l.soc)!;
    const share = node.h / node.links;
    const used = rightUsed.get(l.soc) ?? 0;
    ribbons.push({
      ...l,
      y0: y0.get(`${l.cip}|${l.soc}`)!,
      y1: node.y + used + (l.links * share) / 2,
      h: Math.max(l.links * unit, 0.6),
      main: l.links === largest.get(l.cip),
      cipTitle: leftAt.get(l.cip)!.title,
      socTitle: node.title,
    });
    rightUsed.set(l.soc, used + l.links * share);
  }
  return { width, height, left, right, ribbons, nodeWidth: 10, leftX: leftLabel, rightX: width - rightLabel - 10 };
}

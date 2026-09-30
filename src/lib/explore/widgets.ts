export const WIDGET_SLOTS = ["top", "left", "right", "bottom"] as const;
export type WidgetSlot = (typeof WIDGET_SLOTS)[number];

export interface WidgetDef {
  id: string;
  slot: WidgetSlot;
  title: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  order?: number;
}

export const SLOT_STYLE: Record<WidgetSlot, { gridColumn: string; gridRow: string; justifySelf: string; alignSelf: string; width?: string }> = {
  top: { gridColumn: "1 / span 3", gridRow: "1", justifySelf: "center", alignSelf: "start", width: "min(760px, 100%)" },
  left: { gridColumn: "1", gridRow: "2", justifySelf: "start", alignSelf: "start", width: "min(460px, 100%)" },
  right: { gridColumn: "3", gridRow: "2", justifySelf: "end", alignSelf: "start", width: "min(320px, 100%)" },
  bottom: { gridColumn: "1 / span 3", gridRow: "3", justifySelf: "center", alignSelf: "end", width: "min(760px, 100%)" },
};

export function groupBySlot<T extends WidgetDef>(widgets: T[]): Record<WidgetSlot, T[]> {
  const out: Record<WidgetSlot, T[]> = { top: [], left: [], right: [], bottom: [] };
  widgets.forEach((w, i) => out[w.slot].push(Object.assign({}, w, { order: w.order ?? i })));
  for (const slot of WIDGET_SLOTS) out[slot].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return out;
}

export function initialCollapsed(widgets: WidgetDef[]): Set<string> {
  return new Set(widgets.filter((w) => w.collapsible && w.defaultCollapsed).map((w) => w.id));
}

export function toggleCollapsed(collapsed: Set<string>, id: string, widgets: WidgetDef[]): Set<string> {
  const def = widgets.find((w) => w.id === id);
  if (!def || !def.collapsible) return collapsed;
  const next = new Set(collapsed);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

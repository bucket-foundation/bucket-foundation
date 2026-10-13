"use client";

import type { CSSProperties, ReactNode } from "react";
import { SLOT_STYLE, WIDGET_SLOTS, groupBySlot, type WidgetDef } from "@/lib/explore/widgets";

export interface WidgetSpec extends WidgetDef {
  node: ReactNode;
}

interface Props {
  widgets: WidgetSpec[];
  collapsed: Set<string>;
  onToggle(id: string): void;
  insetRight?: boolean;
}

const mono = { fontFamily: "var(--font-jetbrains)" };
const CARD: CSSProperties = { background: "rgba(239,232,212,0.94)", border: "1px solid var(--hairline)", color: "var(--basalt)", backdropFilter: "blur(6px)" };

export default function WidgetOverlay({ widgets, collapsed, onToggle, insetRight = false }: Props) {
  const grouped = groupBySlot(widgets);
  return (
    <div data-testid="widget-overlay" className={`absolute inset-0 pointer-events-none grid p-4 gap-3 ${insetRight ? "md:pr-[472px]" : ""}`} style={{ gridTemplateRows: "auto 1fr auto", gridTemplateColumns: "auto 1fr auto" }}>
      {WIDGET_SLOTS.map((slot) =>
        grouped[slot].length ? (
          <div key={slot} data-slot={slot} className="flex flex-col gap-3 pointer-events-none" style={SLOT_STYLE[slot]}>
            {grouped[slot].map((w) => {
              const shut = collapsed.has(w.id);
              return (
                <section key={w.id} data-widget={w.id} data-collapsed={shut ? "true" : "false"} className="pointer-events-auto rounded-2xl shadow-lg px-3 py-2" style={CARD}>
                  {w.collapsible && (
                    <header className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.16em]" style={mono}>
                      <span>{w.title}</span>
                      <button type="button" data-testid={`widget-toggle-${w.id}`} aria-expanded={!shut} aria-label={`${shut ? "expand" : "collapse"} ${w.title}`} onClick={() => onToggle(w.id)} className="px-2 py-0.5 rounded-full border" style={{ borderColor: "var(--hairline)" }}>
                        {shut ? "+" : "−"}
                      </button>
                    </header>
                  )}
                  <div className={shut ? "hidden" : w.collapsible ? "mt-2" : ""}>{w.node}</div>
                </section>
              );
            })}
          </div>
        ) : null,
      )}
    </div>
  );
}

"use client";

import { useState, type ReactNode } from "react";

export type DockLayout = "full" | "compact";
type CompactState = "card" | "nav" | "closed";

const mono = { fontFamily: "var(--font-jetbrains)" };

interface Props {
  stage: ReactNode;
  dock: ReactNode;
  rightNav: ReactNode;
  heading: string;
}

const PANEL = { background: "rgba(20,19,17,0.92)", color: "#EFE8D4" };

export default function StageShell({ stage, dock, rightNav, heading }: Props) {
  const [layout, setLayout] = useState<DockLayout>("full");
  const [compact, setCompact] = useState<CompactState>("card");
  const full = layout === "full";
  return (
    <main data-testid="stage-shell" data-layout={layout} data-compact={full ? undefined : compact} className="relative w-full overflow-hidden" style={{ height: "calc(100dvh - 4.5rem)", minHeight: 480, background: "#141311" }}>
      <h1 className="sr-only">{heading}</h1>
      <div className="absolute inset-0 md:right-80">{stage}</div>

      {full && (
        <div data-testid="dock-full" className="absolute top-0 left-0 right-0 md:right-80 p-3 max-w-3xl" style={PANEL}>
          {dock}
          <button type="button" data-testid="dock-compact" onClick={() => setLayout("compact")} className="mt-2 border hairline px-2 py-1 text-xs" style={mono}>
            Compact
          </button>
        </div>
      )}

      {!full && compact === "nav" && (
        <div data-testid="dock-nav" className="absolute top-0 left-0 bottom-0 w-80 max-w-[85vw] overflow-auto p-3" style={PANEL}>
          {dock}
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={() => setCompact("card")} className="border hairline px-2 py-1 text-xs" style={mono}>
              Move right
            </button>
            <button type="button" onClick={() => setCompact("closed")} className="border hairline px-2 py-1 text-xs" style={mono}>
              Close
            </button>
            <button type="button" data-testid="dock-full-btn" onClick={() => setLayout("full")} className="border hairline px-2 py-1 text-xs" style={mono}>
              Full
            </button>
          </div>
        </div>
      )}

      {!full && compact === "closed" && (
        <div className="absolute top-3 left-3 flex gap-2">
          <button type="button" data-testid="dock-open" aria-label="Open search" onClick={() => setCompact("nav")} className="border hairline px-3 py-2 text-xs" style={{ ...mono, ...PANEL }}>
            Search
          </button>
          <button type="button" onClick={() => setLayout("full")} className="border hairline px-3 py-2 text-xs" style={{ ...mono, ...PANEL }}>
            Full
          </button>
        </div>
      )}

      <div data-testid="right-column" className="absolute right-0 bottom-0 md:top-0 w-full md:w-80 max-h-[45%] md:max-h-none flex flex-col border-l hairline" style={PANEL}>
        {!full && compact === "card" && (
          <div data-testid="dock-card" className="p-3 border-b hairline overflow-auto max-h-[60%]">
            {dock}
            <div className="flex gap-2 mt-3">
              <button type="button" data-testid="dock-to-nav" onClick={() => setCompact("nav")} className="border hairline px-2 py-1 text-xs" style={mono}>
                To left nav
              </button>
              <button type="button" onClick={() => setCompact("closed")} className="border hairline px-2 py-1 text-xs" style={mono}>
                Close
              </button>
              <button type="button" data-testid="dock-full-btn" onClick={() => setLayout("full")} className="border hairline px-2 py-1 text-xs" style={mono}>
                Full
              </button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-auto">{rightNav}</div>
      </div>
    </main>
  );
}

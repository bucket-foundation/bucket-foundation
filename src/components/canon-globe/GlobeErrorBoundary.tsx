"use client";

import { Component, type ReactNode } from "react";
import StaticCanonGlobe from "@/components/CanonGlobe";

/**
 * Catch any error inside the WebGL Canvas (most commonly: browser has
 * WebGL disabled, sandboxed, or the GPU driver is blocked) and render
 * a graceful static fallback. The rest of the page keeps working.
 */
export class GlobeErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: "" };

  static getDerivedStateFromError(err: Error) {
    return { hasError: true, message: err.message || "" };
  }

  componentDidCatch(err: Error) {
    // Surface to console for debugging without crashing the page
    // eslint-disable-next-line no-console
    console.warn("[CanonGlobe] WebGL canvas failed, rendering fallback:", err.message);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center px-6 py-8">
        <StaticCanonGlobe branches={[]} size={360} interactive={false} />
        <div
          className="mt-6 max-w-md mx-auto rounded-md border px-5 py-4"
          style={{
            background: "var(--bone)",
            borderColor: "var(--hairline)",
          }}
        >
          <div
            className="small-caps text-[11px] tracking-[0.2em] mb-2"
            style={{ color: "var(--gold)", fontFamily: "var(--font-jetbrains)" }}
          >
            interactive globe needs WebGL
          </div>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--basalt)", fontFamily: "var(--font-fraunces)" }}
          >
            Your browser is reporting WebGL is disabled or blocked
            (often a privacy / hardware acceleration setting). The rest
            of the canon — search, claims, bridges, knowledge graph —
            works without it.
          </p>
          <p
            className="text-xs mt-3"
            style={{ color: "var(--parchment-dim)", fontFamily: "var(--font-fraunces)" }}
          >
            To enable: <code>chrome://gpu</code> or browser settings →
            enable hardware acceleration.
          </p>
        </div>
      </div>
    );
  }
}

"use client";

import { Component, type ReactNode } from "react";

/**
 * Silent error boundary around the WebGL Canvas. If Three.js fails to
 * acquire a context (browser blocks WebGL via fingerprint shields,
 * hardware acceleration off, sandboxed renderer, etc.), the boundary
 * renders empty space where the globe would have been, no message,
 * no fallback graphic. Rest of the page keeps working.
 */
export class GlobeErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    // Silent. Don't log to console. Don't render anything.
  }

  render() {
    if (this.state.hasError) {
      return <div style={{ width: "100%", height: "100%" }} />;
    }
    return this.props.children;
  }
}

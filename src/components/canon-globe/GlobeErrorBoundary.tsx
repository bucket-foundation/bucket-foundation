"use client";

import { Component, type ReactNode } from "react";

/**
 * Error boundary around the WebGL Canvas. If Three.js fails to acquire
 * a context (browser blocks WebGL via fingerprint shields, hardware
 * acceleration off, sandboxed renderer, etc.), the boundary renders
 * empty space where the globe would have been, no visual fallback.
 * The rest of the page keeps working. A console.warn is the only
 * trace, so a failed context shows up in devtools without ever
 * changing what the page looks like.
 */
export class GlobeErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  private lastStatus: string | null = null;

  // Chromium puts the driver's reason for refusing a WebGL context in the
  // event's statusMessage (GPU process disabled, blocklisted adapter, too
  // many live contexts). The event fires on the canvas before Three.js
  // throws, so a capturing listener on document sees it first.
  private onCreationError = (event: Event) => {
    const status = (event as WebGLContextEvent).statusMessage || "";
    this.lastStatus = status;
    console.error(
      "[canon-globe] WebGL context creation refused by the browser:",
      status || "(no status message)"
    );
  };

  componentDidMount() {
    document.addEventListener("webglcontextcreationerror", this.onCreationError, true);
  }

  componentWillUnmount() {
    document.removeEventListener("webglcontextcreationerror", this.onCreationError, true);
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn(
      "[canon-globe] render error, falling back to empty space:",
      error,
      this.lastStatus ? `browser status: ${this.lastStatus}` : "browser status: none reported"
    );
  }

  render() {
    if (this.state.hasError) {
      return <div style={{ width: "100%", height: "100%" }} />;
    }
    return this.props.children;
  }
}

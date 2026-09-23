"use client";

import { Component, type ReactNode } from "react";

export class GlobeErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  private lastStatus: string | null = null;

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

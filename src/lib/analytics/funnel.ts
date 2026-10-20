import { track } from "@vercel/analytics";

export const FUNNEL_EVENTS = ["start_learning_click", "open_research_os", "sign_in_complete", "download_click", "download_complete"] as const;
export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];
export type FunnelProps = Record<string, string | number | boolean | null>;

export const START_LEARNING_HREF = "/research-os/learn";

export const DEMO_PARAM = "demo";
const DEMO_KEY = "bucket-demo-session";
const DEMO_RE = /^[a-z0-9-]{1,32}$/;

export function demoSession(search: string, stored: string | null): string | null {
  const fromUrl = new URLSearchParams(search).get(DEMO_PARAM);
  if (fromUrl && DEMO_RE.test(fromUrl)) return fromUrl;
  return stored && DEMO_RE.test(stored) ? stored : null;
}

function currentDemo(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const demo = demoSession(window.location.search, sessionStorage.getItem(DEMO_KEY));
    if (demo) sessionStorage.setItem(DEMO_KEY, demo);
    return demo;
  } catch {
    return null;
  }
}

export function trackFunnel(event: FunnelEvent, props: FunnelProps = {}): void {
  const demo = currentDemo();
  track(event, demo ? { ...props, demo } : props);
}

const OPENED_KEY = "bucket-opened-research-os";

export function trackOpenOnce(props: FunnelProps): void {
  try {
    if (sessionStorage.getItem(OPENED_KEY)) return;
    sessionStorage.setItem(OPENED_KEY, "1");
  } catch {
  }
  trackFunnel("open_research_os", props);
}

export function downloadTarget(el: Element | null): string | null {
  const a = el?.closest("a[href]");
  if (!a || a.hasAttribute("data-device-fallback")) return null;
  if (!a.closest("[data-device-picker], [data-download-pane]")) return null;
  const d = (a as HTMLElement).dataset;
  return d.devicePrimary ?? d.windowedInstaller ?? a.closest("[data-device-other]")?.getAttribute("data-device-other") ?? "other";
}

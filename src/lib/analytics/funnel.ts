import { track } from "@vercel/analytics";

export const FUNNEL_EVENTS = ["start_learning_click", "open_research_os", "sign_in_complete", "download_click", "download_complete"] as const;
export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];
export type FunnelProps = Record<string, string | number | boolean | null>;

export const START_LEARNING_HREF = "/research-os/learn";

export function trackFunnel(event: FunnelEvent, props: FunnelProps = {}): void {
  track(event, props);
}

export function downloadTarget(el: Element | null): string | null {
  const a = el?.closest("a[href]");
  if (!a || a.hasAttribute("data-device-fallback")) return null;
  if (!a.closest("[data-device-picker], [data-download-pane]")) return null;
  const d = (a as HTMLElement).dataset;
  return d.devicePrimary ?? d.windowedInstaller ?? a.closest("[data-device-other]")?.getAttribute("data-device-other") ?? "other";
}

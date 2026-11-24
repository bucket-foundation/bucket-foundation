import type { Access } from "./app/plans";
import type { FunnelStep, OnboardingScreen } from "./funnel-steps";
import { local } from "./storage";

type Store = Pick<Storage, "getItem" | "setItem">;
type Utm = { s: string | null; m: string | null; c: string | null };
type Send = (body: string) => void;

const ONCE: readonly FunnelStep[] = ["signup", "first_lesson", "trial_start", "paid", "heard_about", "trial_cancel_d0"];
const NO_UTM: Utm = { s: null, m: null, c: null };

function visitorId(store: Store | null, make: () => string): string {
  const have = store?.getItem("pl.vid");
  if (have) return have;
  const id = make();
  store?.setItem("pl.vid", id);
  return id;
}

function utm(store: Store | null, search: string): Utm {
  const q = new URLSearchParams(search);
  if (q.get("utm_source")) {
    const t = { s: q.get("utm_source"), m: q.get("utm_medium"), c: q.get("utm_campaign") };
    store?.setItem("pl.utm", JSON.stringify(t));
    return t;
  }
  try {
    return (JSON.parse(store?.getItem("pl.utm") || "null") as Utm | null) ?? NO_UTM;
  } catch {
    return NO_UTM;
  }
}

export function funnelBody(step: FunnelStep, ctx: { store: Store | null; search: string; path: string; lang: string; make: () => string; detail?: string }): string | null {
  const onceKey = `pl.funnel.${step}`;
  if (ONCE.includes(step)) {
    if (ctx.store?.getItem(onceKey)) return null;
    ctx.store?.setItem(onceKey, "1");
  }
  const t = utm(ctx.store, ctx.search);
  return JSON.stringify({
    visitor: visitorId(ctx.store, ctx.make),
    events: [{ name: step, path: ctx.path, utm_source: t.s, utm_medium: t.m, utm_campaign: t.c, lang: ctx.lang, ...(ctx.detail ? { detail: ctx.detail } : {}) }],
  });
}

const PAID_PRODUCTS: readonly string[] = ["com.polingual.monthly", "com.polingual.yearly", "web.polingual.monthly", "web.polingual.yearly"];

export function accessStep(access: Access): FunnelStep | null {
  if (access.status !== "open") return null;
  if (access.trial) return "trial_start";
  return access.productId && PAID_PRODUCTS.includes(access.productId) ? "paid" : null;
}

function beacon(body: string): void {
  try {
    if (navigator.sendBeacon?.("/api/events", body)) return;
    void fetch("/api/events", { method: "POST", body, keepalive: true }).catch(() => {});
  } catch {}
}

export function visitor(): string | null {
  if (typeof window === "undefined") return null;
  return visitorId(local(), () => crypto.randomUUID());
}

export function onboarding(screen: OnboardingScreen, send: Send = beacon): void {
  track("onboarding_view", send, screen);
}

export function track(step: FunnelStep, send: Send = beacon, detail?: string): void {
  if (typeof window === "undefined") return;
  const body = funnelBody(step, {
    store: local(),
    search: window.location.search,
    path: window.location.pathname,
    lang: document.documentElement.lang || "en",
    make: () => crypto.randomUUID(),
    detail,
  });
  if (body) send(body);
}

import type { AdMode, Entitlement } from "../lobby/ads";

export type Account = "checking" | "signed-out" | "free" | "paid";
export type Phase = "playing" | "done" | "archive";

export function accountOf(e: Entitlement | "checking"): Account {
  if (e === "checking") return "checking";
  if (e === "subscriber") return "paid";
  if (e === "signed-out") return "signed-out";
  return "free";
}

export interface Cta {
  id: "sign-in" | "start" | "continue";
  label: string;
  href: string;
  primary: boolean;
}

export function ctasFor(account: Account): Cta[] {
  if (account === "checking") return [];
  if (account === "paid") return [{ id: "continue", label: "Continue learning", href: "/app?from=polyword", primary: true }];
  if (account === "free") return [{ id: "start", label: "Start learning", href: "/app?from=polyword", primary: true }];
  return [
    { id: "start", label: "Start learning", href: "/app?from=polyword", primary: true },
    { id: "sign-in", label: "Sign in", href: "/app?from=polyword&signin=1", primary: false },
  ];
}

export function pauseFrameAds(phase: Phase, first: boolean): boolean {
  return phase === "playing" || first;
}

export function resultsAd(phase: Phase, first: boolean, account: Account): boolean {
  return phase === "done" && !first && (account === "signed-out" || account === "free");
}

export type ArchiveOffer = { pro: true } | { pro: false; rewarded: boolean };

export function archiveOffer(account: Account, mode: AdMode, rewardReady: boolean): ArchiveOffer {
  if (account === "paid") return { pro: true };
  return { pro: false, rewarded: mode !== "off" && rewardReady };
}

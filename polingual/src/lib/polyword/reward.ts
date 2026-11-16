type RewardOutcome = "viewed" | "dismissed" | "unavailable";

type BreakConfig = {
  type: "reward";
  name: string;
  beforeReward: (show: () => void) => void;
  adViewed: () => void;
  adDismissed: () => void;
  adBreakDone: (info: { breakStatus?: string }) => void;
};

export interface H5Window {
  adsbygoogle?: unknown[];
  adBreak?: (o: BreakConfig) => void;
  adConfig?: (o: Record<string, unknown>) => void;
}

export function installH5(w: H5Window): void {
  w.adsbygoogle = w.adsbygoogle || [];
  if (w.adBreak) return;
  const push = (o: unknown) => {
    (w.adsbygoogle as unknown[]).push(o);
  };
  w.adBreak = push;
  w.adConfig = push;
  w.adConfig({ preloadAdBreaks: "on", sound: "on" });
}

export function requestReward(w: H5Window, name: string, timeoutMs = 15_000): Promise<RewardOutcome> {
  return new Promise((resolve) => {
    if (!w.adBreak) return resolve("unavailable");
    let settled = false;
    const done = (o: RewardOutcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(o);
    };
    const timer = setTimeout(() => done("unavailable"), timeoutMs);
    w.adBreak({
      type: "reward",
      name,
      beforeReward: (show) => show(),
      adViewed: () => done("viewed"),
      adDismissed: () => done("dismissed"),
      adBreakDone: (info) => done(info?.breakStatus === "viewed" ? "viewed" : info?.breakStatus === "dismissed" ? "dismissed" : "unavailable"),
    });
  });
}

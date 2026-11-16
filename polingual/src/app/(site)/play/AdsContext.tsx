"use client";

import { createContext, useContext, useEffect } from "react";

const AdsVisible = createContext(false);
const AdsPause = createContext<(paused: boolean) => void>(() => {});

export const AdsProvider = AdsVisible.Provider;
export const AdsPauseProvider = AdsPause.Provider;

export function useAdsVisible(): boolean {
  return useContext(AdsVisible);
}

export function usePauseAds(paused: boolean): void {
  const set = useContext(AdsPause);
  useEffect(() => {
    set(paused);
    return () => set(false);
  }, [set, paused]);
}

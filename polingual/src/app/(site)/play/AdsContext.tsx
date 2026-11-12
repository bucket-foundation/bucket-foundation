"use client";

import { createContext, useContext } from "react";

const AdsVisible = createContext(false);

export const AdsProvider = AdsVisible.Provider;

export function useAdsVisible(): boolean {
  return useContext(AdsVisible);
}

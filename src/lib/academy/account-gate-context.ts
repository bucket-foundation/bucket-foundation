"use client";

import { createContext, useContext } from "react";

export type GatedAction = () => void;

export interface AccountGate {
  guest: boolean;
  requireAccount: (action?: GatedAction) => void;
  openSignIn: () => void;
}

export const AccountGateContext = createContext<AccountGate>({ guest: false, requireAccount: (a) => a?.(), openSignIn: () => {} });

export function useAccountGate(): AccountGate {
  return useContext(AccountGateContext);
}

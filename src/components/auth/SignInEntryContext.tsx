"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DOWNLOAD_PATH } from "@/lib/sign-in-gate";
import { signInUrl } from "@/lib/auth/paths";

const SignInClosedContext = createContext(false);

export function SignInEntryProvider({ closed, children }: { closed: boolean; children: ReactNode }) {
  return <SignInClosedContext.Provider value={closed}>{children}</SignInClosedContext.Provider>;
}

export function useSignInClosed(): boolean {
  return useContext(SignInClosedContext);
}

export function useSignInHref(nextPath: string): string {
  return useSignInClosed() ? DOWNLOAD_PATH : signInUrl(nextPath);
}

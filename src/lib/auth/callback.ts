import type { EmailOtpType } from "@supabase/supabase-js";
import { SIGN_IN_PATH, safeNextPath } from "./paths";

export const CALLBACK_PATH = "/auth/callback";
export const DEFAULT_AFTER_CALLBACK = "/learn";

export const CALLBACK_ERRORS = {
  link_failed: "That sign-in link did not work. Ask for a new one.",
  link_incomplete: "That sign-in link is incomplete. Ask for a new one.",
  link_expired: "That sign-in link expired or was already used. Ask for a new one.",
} as const;

export type CallbackError = keyof typeof CALLBACK_ERRORS;

export function callbackErrorMessage(code: string | null): string | null {
  return code && Object.prototype.hasOwnProperty.call(CALLBACK_ERRORS, code) ? CALLBACK_ERRORS[code as CallbackError] : null;
}

const OTP_TYPES: readonly string[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

type AuthResult = Promise<{ error: { message: string } | null }>;

export interface CallbackAuth {
  exchangeCodeForSession(code: string): AuthResult;
  verifyOtp(params: { token_hash: string; type: EmailOtpType }): AuthResult;
}

export function callbackNext(raw: string | null): string {
  if (!raw) return DEFAULT_AFTER_CALLBACK;
  const trimmed = raw.trim();
  return safeNextPath(trimmed) === trimmed ? trimmed : DEFAULT_AFTER_CALLBACK;
}

export function callbackRedirectUrl(origin: string, next: string): string {
  return `${origin}${CALLBACK_PATH}?next=${encodeURIComponent(callbackNext(next))}`;
}

function signInError(origin: string, error: CallbackError, next: string): URL {
  const url = new URL(SIGN_IN_PATH, origin);
  url.searchParams.set("error", error);
  if (next !== DEFAULT_AFTER_CALLBACK) url.searchParams.set("next", next);
  return url;
}

export async function resolveCallback(requestUrl: URL, auth: () => CallbackAuth): Promise<URL> {
  const origin = requestUrl.origin;
  const params = requestUrl.searchParams;
  const next = callbackNext(params.get("next"));
  if (params.get("error") || params.get("error_description")) {
    return signInError(origin, "link_failed", next);
  }

  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type");

  let result: Awaited<AuthResult>;
  try {
    if (code) {
      result = await auth().exchangeCodeForSession(code);
    } else if (tokenHash && type && OTP_TYPES.includes(type)) {
      result = await auth().verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
    } else {
      return signInError(origin, "link_incomplete", next);
    }
  } catch {
    result = { error: { message: "exchange failed" } };
  }

  if (result.error) {
    return signInError(origin, "link_expired", next);
  }
  return new URL(next, origin);
}

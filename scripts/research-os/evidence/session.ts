/**
 * A bearer token for one local account, for the two gate runs.
 *
 * The route accepts a bearer token and verifies it against Supabase, the
 * same path the browser's session takes. Rather than drive the sign-in
 * form, this asks the local stack's admin API for a one-time link and
 * redeems it, which needs the service-role key and works offline.
 *
 * Local stacks only. The service-role key belongs to the operator's
 * machine, and this refuses any Supabase URL that is not loopback.
 */
import { createClient } from "@supabase/supabase-js";

export interface Session {
  learnerId: string;
  email: string;
  accessToken: string;
}

function loopback(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "127.0.0.1" || host === "::1" || host === "localhost";
  } catch {
    return false;
  }
}

/**
 * Signs `email` in and returns its id and access token. The account has to
 * exist: this creates nobody, so a gate run cannot invent a pilot member.
 */
export async function signIn(email: string, env: NodeJS.ProcessEnv = process.env): Promise<Session> {
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const service = env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !anon || !service) throw new Error("set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY");
  if (!loopback(url)) throw new Error(`the gates run against a local stack; ${url} is not loopback`);

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error || !link.data?.properties?.hashed_token) {
    throw new Error(`no sign-in link for ${email}: ${link.error?.message ?? "the account may not exist"}`);
  }
  const user = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const redeemed = await user.auth.verifyOtp({ type: "magiclink", token_hash: link.data.properties.hashed_token });
  const token = redeemed.data?.session?.access_token;
  const id = redeemed.data?.user?.id;
  if (redeemed.error || !token || !id) throw new Error(`the sign-in link did not redeem: ${redeemed.error?.message ?? "no session"}`);
  return { learnerId: id, email, accessToken: token };
}

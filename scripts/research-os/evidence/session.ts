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

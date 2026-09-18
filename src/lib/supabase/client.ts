// src/lib/supabase/client.ts
//
// Back-compat entry for `import { supabase } from "@/lib/supabase/client"`
// and `getSupabase()`. Both resolve to the cookie-backed browser client in
// ./browser, so every caller shares the site session. Instantiation stays
// lazy: nothing is built until the first method call at runtime.
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserSupabase } from "./browser";

export function getSupabase(): SupabaseClient {
  return getBrowserSupabase();
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop: string | symbol) {
    const real = getSupabase() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(real) : value;
  },
});

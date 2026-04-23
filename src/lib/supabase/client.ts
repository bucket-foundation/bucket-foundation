// src/lib/supabase/client.ts
//
// Lazy Supabase client. The original module instantiated `createClient` at
// import time, which crashed Next's static prerender whenever
// NEXT_PUBLIC_SUPABASE_URL was absent (e.g. `next build` without an .env).
// Now we expose a `getSupabase()` factory + a memoized Proxy so existing
// `import { supabase }` callers keep working, but instantiation is deferred
// until first method call on the runtime — by which point Vercel / dev-server
// env vars are always set.
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      'Supabase env missing — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }
  _client = createClient(url, anon);
  return _client;
}

// Back-compat: `import { supabase }` still works. All method access is
// delegated through `getSupabase()` so it only constructs on first use.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop: string | symbol) {
    const real = getSupabase() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(real) : value;
  },
});

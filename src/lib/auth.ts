// src/lib/auth.ts
// NextAuth v4 config, email magic link, JWT session.
// Dynamic web3 wallet auth is a future bead; this is the v1 minimum.
//
// Build-safe: if Supabase env vars are missing (Vercel preview without
// secrets, local dev without .env), authOptions becomes a stub that
// signals "not configured" at runtime instead of crashing the build.

import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { SupabaseAdapter } from "@auth/supabase-adapter";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const AUTH_CONFIGURED = Boolean(supabaseUrl && supabaseSecret);

// bkt-vn5: NextAuth EmailProvider requires a database adapter, magic-link
// flow needs a `verification_tokens` table to persist the one-time token
// between request and click. Wired to Supabase. The Supabase project must
// have the next-auth schema applied: https://authjs.dev/reference/adapter/supabase

export const authOptions: NextAuthOptions = AUTH_CONFIGURED
  ? {
      adapter: SupabaseAdapter({
        url: supabaseUrl as string,
        secret: supabaseSecret as string,
      }),
      providers: [
        EmailProvider({
          server: process.env.EMAIL_SERVER || "",
          from: process.env.EMAIL_FROM || "no-reply@bucket.foundation",
        }),
      ],
      session: { strategy: "jwt" },
      secret: process.env.NEXTAUTH_SECRET,
      pages: {
        signIn: "/chat",
      },
      callbacks: {
        async session({ session, token }) {
          if (session.user && token.sub) {
            (session.user as { id?: string }).id = token.sub;
          }
          return session;
        },
      },
    }
  : {
      // Stub config, auth disabled. Routes that import authOptions still
      // load, but getServerSession() returns null and NextAuth handlers
      // return 503 via the route wrapper.
      providers: [],
      session: { strategy: "jwt" },
      secret: process.env.NEXTAUTH_SECRET || "dev-unconfigured-secret",
    };

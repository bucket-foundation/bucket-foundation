// src/lib/auth.ts
// NextAuth v4 config — email magic link, JWT session.
// Dynamic web3 wallet auth is a future bead; this is the v1 minimum.

import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { SupabaseAdapter } from "@auth/supabase-adapter";

// bkt-vn5: NextAuth EmailProvider requires a database adapter — magic-link
// flow needs a `verification_tokens` table to persist the one-time token
// between request and click. JWT-only config 500s at runtime. Wired to
// Supabase (the venture already runs on Supabase per CLAUDE.md).
//
// TODO: the Supabase project MUST have the next-auth schema applied before
// the email magic-link flow will work. Apply the SQL from:
//   https://authjs.dev/reference/adapter/supabase
// (creates `next_auth` schema with users / accounts / sessions /
// verification_tokens tables + RLS policies).

export const authOptions: NextAuthOptions = {
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
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
};

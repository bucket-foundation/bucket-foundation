// src/lib/auth.ts
// NextAuth v4 config — email magic link, JWT session.
// Dynamic web3 wallet auth is a future bead; this is the v1 minimum.

import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";

// TODO(bkt-q7k+3): swap memory adapter for a real one (Supabase, Prisma, etc.)
//   For now JWT-only sessions skip the user table requirement so we can ship
//   the chat preview without a DB migration.

export const authOptions: NextAuthOptions = {
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

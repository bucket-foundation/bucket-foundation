import { isLaunchStaff } from "@/lib/research-os/launch-gate";

export interface Staff {
  id: string;
  email: string;
}

export const FIXTURE_STAFF: Staff = { id: "00000000-0000-4000-8000-0000000000aa", email: "staff@fixtures.local" };

type Env = Record<string, string | undefined>;

export function fixturesEnabled(env: Env = process.env): boolean {
  return env.ADMIN_FIXTURES === "1" && env.NODE_ENV !== "production" && !env.VERCEL;
}

export function resolveStaff(user: { id: string; email?: string | null } | null, env: Env = process.env): Staff | null {
  if (fixturesEnabled(env)) return FIXTURE_STAFF;
  if (!user?.id || !user.email || !isLaunchStaff(user)) return null;
  return { id: user.id, email: user.email };
}

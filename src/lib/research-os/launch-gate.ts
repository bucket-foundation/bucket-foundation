import { NextResponse, type NextRequest } from "next/server";
import { verifyLearnerIdentity } from "./db";
import { inLaunchScope } from "./launch-scope";
import { isReviewerEmail } from "./reviewer";

export function isLaunchStaff(identity: { email?: string | null } | null): boolean {
  return Boolean(identity?.email && isReviewerEmail(identity.email));
}

export function launchPageAllowed(route: string, identity: { email?: string | null } | null): boolean {
  return inLaunchScope(route) || isLaunchStaff(identity);
}

export function launchNotFound(): NextResponse {
  return NextResponse.json({ error: "not_found" }, { status: 404, headers: { "cache-control": "private, no-store" } });
}

export async function launchRefusal(req: NextRequest): Promise<Response | null> {
  if (inLaunchScope(new URL(req.url).pathname)) return null;
  return isLaunchStaff(await verifyLearnerIdentity(req)) ? null : launchNotFound();
}

export function staffOnlyAtLaunch<A extends unknown[]>(handler: (req: NextRequest, ...rest: A) => Promise<Response>) {
  return async (req: NextRequest, ...rest: A): Promise<Response> => (await launchRefusal(req)) ?? handler(req, ...rest);
}

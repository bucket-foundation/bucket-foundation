import { NextResponse, type NextRequest } from "next/server";
import { verifyLearnerIdentity } from "./db";
import { inLaunchScope, isWriteMethod, launchAllows } from "./launch-scope";
import { isStaff } from "./staff";

export function launchNotFound(): NextResponse {
  return NextResponse.json({ error: "not_found" }, { status: 404, headers: { "cache-control": "private, no-store" } });
}

export async function launchWriteRefusal(req: NextRequest): Promise<Response | null> {
  if (!isWriteMethod(req.method)) return null;
  const path = new URL(req.url).pathname;
  if (inLaunchScope(path)) return null;
  const identity = await verifyLearnerIdentity(req);
  return launchAllows(path, await isStaff(identity)) ? null : launchNotFound();
}

export function staffWritesAtLaunch<A extends unknown[]>(handler: (req: NextRequest, ...rest: A) => Promise<Response>) {
  return async (req: NextRequest, ...rest: A): Promise<Response> => (await launchWriteRefusal(req)) ?? handler(req, ...rest);
}

import type { NextRequest } from "next/server";
import { conversionFromBody, sendConversions } from "./ads";

export async function reportSignup(req: NextRequest, body: unknown, email: string): Promise<void> {
  const c = conversionFromBody(body);
  if (!c) return;
  const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  await sendConversions(process.env, { ...c, email, ip, userAgent: req.headers.get("user-agent"), url: req.headers.get("referer") || "https://www.polingual.com/" });
}

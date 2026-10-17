import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { parseSignup, type Signup } from "@/lib/signup";
import { insertSignup } from "@/lib/photon-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function limited(ip: string, now = Date.now()): boolean {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

async function saveLocal(s: Signup): Promise<void> {
  const dir = path.join(process.cwd(), ".data");
  await fs.mkdir(dir, { recursive: true });
  await fs.appendFile(path.join(dir, "signups.jsonl"), JSON.stringify({ ...s, created_at: new Date().toISOString() }) + "\n");
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(ip)) return NextResponse.json({ error: "Too many tries. Wait a minute." }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send the form as JSON." }, { status: 400 });
  }
  const parsed = parseSignup(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (parsed.suspect) return NextResponse.json({ ok: true });

  try {
    if (process.env.VERCEL) await insertSignup(parsed.signup);
    else await saveLocal(parsed.signup);
  } catch (err) {
    console.error("[signup] insert failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Your signup did not save. Try again in a minute." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

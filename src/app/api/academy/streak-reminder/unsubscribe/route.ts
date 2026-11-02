import { NextRequest, NextResponse } from "next/server";
import { STREAK_UNSUBSCRIBE_PATH, verifyStreakUnsubscribe } from "@/lib/academy/streak-reminder";
import { disableReminders } from "@/lib/academy/streak-reminder-server";
import { escapeHtml, SITE_URL } from "@/lib/whats-new-email/digest";
import { unsubscribeSecret } from "@/lib/whats-new-email/unsubscribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "cache-control": "no-store", "content-type": "text/html; charset=utf-8", "referrer-policy": "no-referrer", "x-robots-tag": "noindex" };

function page(title: string, body: string, status = 200): NextResponse {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:#f4efe6;color:#1d1a16;font:16px/1.6 Georgia,serif"><main style="max-width:520px;margin:64px auto;padding:0 16px">
<h1 style="font-weight:400;font-size:26px">${escapeHtml(title)}</h1>${body}
<p><a href="${SITE_URL}/settings" style="color:#1d1a16">Bucket settings</a></p></main></body></html>`;
  return new NextResponse(html, { status, headers: HEADERS });
}

function invalid(): NextResponse {
  return page("This link does not work", "<p>The unsubscribe link is incomplete or was changed. Use the link from the most recent email.</p>", 400);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const q = req.nextUrl.searchParams;
  const u = q.get("u");
  const s = q.get("s");
  if (!verifyStreakUnsubscribe(u, s, unsubscribeSecret())) return invalid();
  const action = `${STREAK_UNSUBSCRIBE_PATH}?u=${encodeURIComponent(u!)}&s=${encodeURIComponent(s!)}`;
  return page(
    "Stop streak reminders",
    `<form method="post" action="${escapeHtml(action)}"><button type="submit" style="font:inherit;padding:10px 18px;background:#1d1a16;color:#f4efe6;border:0;cursor:pointer">Unsubscribe</button></form>`,
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const q = req.nextUrl.searchParams;
  const userId = verifyStreakUnsubscribe(q.get("u"), q.get("s"), unsubscribeSecret());
  if (!userId) return invalid();
  try {
    await disableReminders(userId);
  } catch (err) {
    console.error("[streak-reminder] opt-out save failed:", err instanceof Error ? err.message : "unknown");
    return page("Try again later", "<p>We could not save your choice. Try the link again in a few minutes.</p>", 502);
  }
  return page("You are unsubscribed", "<p>You will get no more streak reminders by email or app notification. Turn them back on in settings.</p>");
}

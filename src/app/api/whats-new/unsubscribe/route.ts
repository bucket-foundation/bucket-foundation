import { NextRequest, NextResponse } from "next/server";
import { escapeHtml, SITE_URL } from "@/lib/whats-new-email/digest";
import { getOptOutStore, recordOptOut, unsubscribeSecret, UNSUBSCRIBE_PATH, verifyUnsubscribe } from "@/lib/whats-new-email/unsubscribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "cache-control": "no-store", "content-type": "text/html; charset=utf-8", "referrer-policy": "no-referrer", "x-robots-tag": "noindex" };

function page(title: string, body: string, status = 200): NextResponse {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:#f4efe6;color:#1d1a16;font:16px/1.6 Georgia,serif"><main style="max-width:520px;margin:64px auto;padding:0 16px">
<h1 style="font-weight:400;font-size:26px">${escapeHtml(title)}</h1>${body}
<p><a href="${SITE_URL}/whats-new" style="color:#1d1a16">What's New on bucket.foundation</a></p></main></body></html>`;
  return new NextResponse(html, { status, headers: HEADERS });
}

function invalid(): NextResponse {
  return page("This link does not work", "<p>The unsubscribe link is incomplete or was changed. Use the link from the most recent email.</p>", 400);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const q = req.nextUrl.searchParams;
  const k = q.get("k");
  const s = q.get("s");
  if (!verifyUnsubscribe(k, s, unsubscribeSecret() ?? undefined)) return invalid();
  const action = `${UNSUBSCRIBE_PATH}?k=${encodeURIComponent(k!)}&s=${encodeURIComponent(s!)}`;
  return page(
    "Stop the daily What's New email",
    `<form method="post" action="${escapeHtml(action)}"><button type="submit" style="font:inherit;padding:10px 18px;background:#1d1a16;color:#f4efe6;border:0;cursor:pointer">Unsubscribe</button></form>`,
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const q = req.nextUrl.searchParams;
  const key = verifyUnsubscribe(q.get("k"), q.get("s"), unsubscribeSecret() ?? undefined);
  if (!key) return invalid();
  const store = getOptOutStore();
  if (!store) return page("Try again later", "<p>We could not save your choice. Try the link again in a few minutes.</p>", 503);
  try {
    await recordOptOut(store, key, Date.now());
  } catch (err) {
    console.error("[whats-new] opt-out save failed:", err instanceof Error ? err.message : "unknown");
    return page("Try again later", "<p>We could not save your choice. Try the link again in a few minutes.</p>", 502);
  }
  return page("You are unsubscribed", "<p>You will get no more daily What's New emails. Sign up again on the site to turn them back on.</p>");
}

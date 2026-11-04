import { NextResponse, type NextRequest } from "next/server";
import { verifyModerationToken } from "@/lib/academy/group-shares";
import { drainPurge, itemById, signedImageUrls } from "@/lib/academy/group-shares-server";
import { configured, service } from "@/lib/academy/groups-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex", "referrer-policy": "no-referrer" };

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

function page(title: string, body: string, status = 200): NextResponse {
  return new NextResponse(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(title)}</title><body style="font:16px system-ui;max-width:640px;margin:32px auto;padding:0 16px"><h1>${escape(title)}</h1>${body}</body>`, { status, headers: HEADERS });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get("t");
  const claim = verifyModerationToken(token, process.env.MODERATION_SECRET?.trim());
  if (!claim) return page("Link expired", "<p>This review link is invalid or expired.</p>", 404);
  if (!configured()) return page("Unavailable", "<p>The database is not configured.</p>", 503);
  try {
    const item = await itemById(claim.itemId);
    if (!item) return page("Item gone", "<p>The item no longer exists.</p>", 404);
    const image = item.image_path && !item.removed_at ? (await signedImageUrls([item.image_path])).get(item.image_path) : null;
    const state = item.removed_at ? "Removed" : item.held_at ? "Hidden pending review" : "Visible";
    const parts = [
      `<p>State: ${escape(state)}<br>Kind: ${escape(item.kind)}<br>Sent: ${escape(item.created_at)}</p>`,
      item.url ? `<p>Link: <code>${escape(item.url)}</code></p>` : "",
      item.body ? `<p style="white-space:pre-wrap">${escape(item.body)}</p>` : "",
      image ? `<p><img src="${escape(image)}" style="max-width:100%"></p>` : "",
      `<form method="post"><input type="hidden" name="t" value="${escape(token ?? "")}"><button type="submit" style="font-size:18px;padding:10px 18px">${claim.action === "remove" ? "Remove for everyone" : "Restore for the group"}</button></form>`,
    ];
    return page(claim.action === "remove" ? "Remove shared item" : "Restore shared item", parts.join(""));
  } catch (err) {
    console.error("[academy/groups] moderate view:", err instanceof Error ? err.message : err);
    return page("Unavailable", "<p>Try again.</p>", 503);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const form = await req.formData().catch(() => null);
  const claim = verifyModerationToken(form?.get("t"), process.env.MODERATION_SECRET?.trim());
  if (!claim) return page("Link expired", "<p>This review link is invalid or expired.</p>", 404);
  if (!configured()) return page("Unavailable", "<p>The database is not configured.</p>", 503);
  try {
    const res = await service().rpc("moderate_shared_item", { p_item: claim.itemId, p_action: claim.action });
    if (res.error) throw new Error(`moderate_shared_item: ${res.error.message}`);
    if (res.data === "not_found") return page("Item gone", "<p>The item no longer exists.</p>", 404);
    await drainPurge().catch((err) => console.error("[academy/groups] purge:", err instanceof Error ? err.message : err));
    return page(res.data === "restored" ? "Restored" : "Removed", `<p>Item ${escape(claim.itemId)} is ${res.data === "restored" ? "visible to the group again" : "removed and its file deleted"}. The report is marked reviewed.</p>`);
  } catch (err) {
    console.error("[academy/groups] moderate:", err instanceof Error ? err.message : err);
    return page("Unavailable", "<p>Try again.</p>", 503);
  }
}

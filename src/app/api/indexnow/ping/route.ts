import { NextResponse } from "next/server";
import { BRANCHES } from "@/lib/canon";
import {
  INDEXNOW_KEY,
  INDEXNOW_HOST,
  INDEXNOW_KEY_LOCATION,
  INDEXNOW_ENDPOINTS,
} from "@/lib/indexnow";

export const dynamic = "force-dynamic";

const BASE = "https://www.bucket.foundation";

function allUrls(): string[] {
  const top = [
    "", "/canon", "/manifesto", "/protocol", "/protocol/envelope",
    "/build", "/learn", "/cite-forever/v0.1", "/governance", "/about",
    "/join", "/knowledge", "/research", "/kruse", "/kruse/search",
    "/contributors", "/library", "/assets", "/whats-new",
  ];
  const branch = BRANCHES.map((b) => `/canon/${b.slug}`);
  const figures = BRANCHES.flatMap((b) =>
    b.figures.map((f) => `/canon/${b.slug}/figures/${f.slug}`)
  );
  return [...top, ...branch, ...figures].map((p) => `${BASE}${p}`);
}

export async function GET() {
  const urlList = allUrls();
  const body = {
    host: INDEXNOW_HOST,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList,
  };

  const results = await Promise.all(
    INDEXNOW_ENDPOINTS.map(async (endpoint) => {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json; charset=utf-8" },
          body: JSON.stringify(body),
        });
        return { endpoint, status: res.status, ok: res.ok };
      } catch (err) {
        return { endpoint, status: 0, ok: false, error: String(err) };
      }
    })
  );

  return NextResponse.json({
    ok: results.some((r) => r.ok),
    submitted: urlList.length,
    key: INDEXNOW_KEY.slice(0, 8) + "…",
    results,
  });
}

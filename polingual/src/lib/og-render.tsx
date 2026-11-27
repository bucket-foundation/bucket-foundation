import type { ReactElement } from "react";
import { ImageResponse } from "next/og";
import type { OgFontSet } from "./og-fonts";
import { tokens } from "@/ui/tokens";

const C = tokens.color;

const OG_SIZE = { width: 1200, height: 630 };
export const OG_CACHE_OK = "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=2592000";
export const OG_CACHE_IMMUTABLE = "public, max-age=31536000, s-maxage=31536000, immutable";
export const OG_CACHE_FAIL = "no-store";
export const OG_CACHE_MISSING = "public, max-age=3600, s-maxage=86400";

function fallbackCard(): ReactElement {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: C.paper, color: C.tyrian }}>
      <div style={{ display: "flex", fontSize: 120, fontWeight: 700 }}>Polingual</div>
      <div style={{ display: "flex", fontSize: 36, color: C["ink-dim"], marginTop: 16 }}>Learn several languages at once</div>
    </div>
  );
}

async function png(node: ReactElement, set: OgFontSet | undefined): Promise<ArrayBuffer> {
  const fonts = set && set.fonts.length > 0 ? { fonts: set.fonts } : {};
  return new ImageResponse(node, { ...OG_SIZE, ...fonts }).arrayBuffer();
}

function respond(body: ArrayBuffer, cache: string): Response {
  return new Response(body, { headers: { "content-type": "image/png", "cache-control": cache } });
}

export async function renderOg(node: ReactElement, set: OgFontSet, okCache: string = OG_CACHE_OK): Promise<Response> {
  try {
    return respond(await png(node, set), set.complete ? okCache : OG_CACHE_FAIL);
  } catch {
    try {
      return respond(await png(fallbackCard(), undefined), OG_CACHE_FAIL);
    } catch {
      return new Response("Image render failed", { status: 500, headers: { "cache-control": OG_CACHE_FAIL } });
    }
  }
}

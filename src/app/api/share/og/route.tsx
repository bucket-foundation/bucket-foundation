import { ImageResponse } from "next/og";
import { langName, ogParams, shareView } from "@/lib/share/links";

export const runtime = "edge";

export function GET(req: Request) {
  const url = new URL(req.url);
  const { kind, params } = ogParams(url.searchParams);
  const view = shareView(kind, params);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F6EEDC", padding: 64, color: "#231F20" }}>
        <div style={{ display: "flex", fontSize: 24, letterSpacing: 4, textTransform: "uppercase", color: "#8A6E2E" }}>{view.eyebrow}</div>
        <div style={{ display: "flex", fontSize: view.title.length > 40 ? 60 : 84, fontWeight: 800, lineHeight: 1.05, marginTop: 20 }}>{view.title}</div>
        {view.forms.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", marginTop: 34 }}>
            {view.forms.map((f) => (
              <div key={f.lang} style={{ display: "flex", flexDirection: "column", marginRight: 44, marginBottom: 18 }}>
                <div style={{ display: "flex", fontSize: 22, color: "#5d5650", textTransform: "uppercase", letterSpacing: 2 }}>{langName(f.lang)}</div>
                <div style={{ display: "flex", fontSize: 54, fontWeight: 800 }}>{f.form}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", fontSize: 32, lineHeight: 1.35, marginTop: 28, color: "#3a3430" }}>{view.description}</div>
        )}
        <div style={{ display: "flex", marginTop: "auto", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 800, color: "#5B1A4A" }}>bucket.foundation</div>
          <div style={{ display: "flex", fontSize: 24, color: "#5d5650" }}>Free on the App Store</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "cache-control": "public, max-age=86400, s-maxage=31536000, immutable" } },
  );
}

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "feed402/0.2 envelope shape";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "linear-gradient(135deg, #1F1C16 0%, #2A2520 55%, #1A1714 100%)",
          color: "#EFE8D4",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 18,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "#C9A24E",
          }}
        >
          § protocol · envelope
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 92, lineHeight: 1, fontWeight: 700, color: "#EFE8D4" }}>
            one envelope.
          </div>
          <div style={{ fontSize: 92, lineHeight: 1, fontWeight: 700, color: "#C9A24E" }}>
            eight fields.
          </div>
          <div
            style={{
              fontSize: 22,
              color: "#8A8270",
              fontFamily: "monospace",
              marginTop: 12,
            }}
          >
            data · citation · receipt · cite · tags · canon_tier · foundation_branches · provenance
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 20,
            color: "#8A8270",
            borderTop: "1px solid rgba(201,162,78,0.3)",
            paddingTop: 20,
          }}
        >
          <div style={{ display: "flex" }}>feed402/0.2 · x402 · Base</div>
          <div style={{ display: "flex", color: "#C9A24E" }}>bucket.foundation</div>
        </div>
      </div>
    ),
    { ...size },
  );
}

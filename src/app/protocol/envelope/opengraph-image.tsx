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
            "linear-gradient(135deg, #EFE8D4 0%, #E4DCC4 55%, #D3C9AB 100%)",
          color: "#1F1C16",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 18,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "#8A641A",
          }}
        >
          § protocol · envelope
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 92, lineHeight: 1, fontWeight: 700, color: "#1F1C16" }}>
            one envelope.
          </div>
          <div style={{ fontSize: 92, lineHeight: 1, fontWeight: 700, color: "#C9A24E" }}>
            eight fields.
          </div>
          <div
            style={{
              fontSize: 22,
              color: "#4A4238",
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
            color: "#6F6A5E",
            borderTop: "1px solid rgba(31,28,22,0.2)",
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

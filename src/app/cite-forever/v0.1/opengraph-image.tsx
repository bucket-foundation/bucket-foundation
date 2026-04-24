import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "bucket.foundation cite-forever license v0.1";
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
          § license · cite-forever · v0.1
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 96, lineHeight: 1, fontWeight: 700, color: "#EFE8D4" }}>
            free to read.
          </div>
          <div style={{ fontSize: 96, lineHeight: 1, fontWeight: 700, color: "#C9A24E" }}>
            paid to cite.
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#B8AE94",
              fontStyle: "italic",
              maxWidth: 980,
              marginTop: 16,
            }}
          >
            citation fees route to the author, over x402 on Base, forever.
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
          <div style={{ display: "flex" }}>bucket.foundation/cite-forever/v0.1</div>
          <div style={{ display: "flex", color: "#C9A24E" }}>feed402/0.2</div>
        </div>
      </div>
    ),
    { ...size },
  );
}

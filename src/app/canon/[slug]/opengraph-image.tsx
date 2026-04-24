import { ImageResponse } from "next/og";
import { BRANCHES, getBranch } from "@/lib/canon";

export const runtime = "edge";
export const alt = "bucket.foundation canon branch";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateImageMetadata() {
  return BRANCHES.map((b) => ({
    id: b.slug,
    alt: `${b.num} · ${b.name} — bucket.foundation canon`,
    size,
    contentType,
  }));
}

export default function OG({ params }: { params: { slug: string } }) {
  const b = getBranch(params.slug);
  const num = b?.num ?? "§";
  const name = b?.name ?? "canon";
  const note = b?.note ?? "foundations";

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
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 18,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "#8A641A",
          }}
        >
          <div style={{ display: "flex" }}>§ bucket.foundation</div>
          <div style={{ display: "flex" }}>canon · {num}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 128,
              lineHeight: 1,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#1F1C16",
            }}
          >
            {name}
          </div>
          <div
            style={{
              fontSize: 34,
              lineHeight: 1.3,
              color: "#4A4238",
              fontStyle: "italic",
              maxWidth: 980,
            }}
          >
            {note}
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
          <div style={{ display: "flex" }}>free to read · paid to cite</div>
          <div style={{ display: "flex", color: "#C9A24E" }}>
            bucket.foundation
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

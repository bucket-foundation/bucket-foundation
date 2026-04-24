import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "bucket.foundation — learn with Claude · reformative education";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#EFE8D4",
          display: "flex",
          flexDirection: "column",
          padding: "72px",
          fontFamily: "serif",
          color: "#1F1C16",
        }}
      >
        <div
          style={{
            fontSize: 18,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#8A6E2E",
          }}
        >
          § V · reformative education
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 96,
            lineHeight: 1.02,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          Educate yourself.
        </div>
        <div
          style={{
            fontSize: 72,
            lineHeight: 1.02,
            fontStyle: "italic",
            color: "#1E4F5C",
          }}
        >
          Reform the stack.
        </div>
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 22,
          }}
        >
          <div style={{ color: "#3E382C" }}>
            your key · your claude · your corpus
          </div>
          <div
            style={{
              fontSize: 18,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#8A6E2E",
            }}
          >
            bucket.foundation/learn
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

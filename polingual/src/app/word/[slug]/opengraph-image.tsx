import { ImageResponse } from "next/og";
import { LANGS, OG_LANGS, WORDS, capitalize, word } from "@/lib/words";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A word written in six scripts";

export function generateStaticParams() {
  return WORDS.map((w) => ({ slug: w.slug }));
}

const TILES = ["#5B1A4A", "#26428B", "#1E7A5A", "#D9381E", "#E9A23B", "#3A0F2F"];

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const w = word((await params).slug);
  const name = w ? capitalize(w.en) : "Polingual";
  const forms = w ? OG_LANGS.map((l) => w.forms.find((f) => f.lang === l)).filter((f) => f !== undefined) : [];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F6EEDC", color: "#231F20", padding: "44px 64px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontSize: 80, lineHeight: 1.1, fontWeight: 700, color: "#5B1A4A" }}>{name}</div>
          <div style={{ fontSize: 30, color: "#5D5650" }}>{w ? `${w.forms.length} languages` : ""}</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 24 }}>
          {forms.map((f, i) => (
            <div key={f.lang} style={{ width: 344, height: 140, borderRadius: 18, background: TILES[i % TILES.length], color: "#F6EEDC", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 0 rgba(35,31,32,.3)" }}>
              <div style={{ fontSize: f.word.length > 9 ? 42 : 56, lineHeight: 1.1 }}>{f.word}</div>
              <div style={{ fontSize: 22, marginTop: 8, opacity: 0.85 }}>{LANGS[f.lang]?.name}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", fontSize: 28, color: "#5D5650" }}>
          <div>polingual.com</div>
          <div>One word in every language you learn</div>
        </div>
      </div>
    ),
    size,
  );
}

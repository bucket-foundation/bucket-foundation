import { OG_FONT_STACK, loadOgFonts } from "@/lib/og-fonts";
import { renderOg } from "@/lib/og-render";
import { langName, ogParams, shareView } from "@/lib/share";
import { visualOrder } from "@/lib/rtl-shape";

const TILES = ["#5B1A4A", "#26428B", "#1E7A5A", "#D9381E", "#E9A23B", "#3A0F2F"];
const FOOTER = "polingual.com";
const TAGLINE = "Learn several languages at once";

export async function GET(req: Request) {
  const { kind, params } = ogParams(new URL(req.url).searchParams);
  const view = shareView(kind, params);
  const forms = view.forms.map((f) => ({ ...f, form: visualOrder(f.form) }));
  const langLine = view.langs.map(langName).join(" · ");
  const streak = view.streak > 1 ? `${view.streak} day streak` : "";
  const text = [view.eyebrow, view.description, FOOTER, TAGLINE, langLine, streak, view.code, ...forms.flatMap((f) => [f.form, langName(f.lang)])].join(" ");
  const fontSet = await loadOgFonts(text, `${view.title} Polingual`);
  const wide = view.forms.length > 3;
  return renderOg(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F6EEDC", color: "#231F20", padding: "48px 64px", fontFamily: OG_FONT_STACK }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 26, letterSpacing: 3, textTransform: "uppercase", color: "#5D5650" }}>{view.eyebrow}</div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#5B1A4A" }}>Polingual</div>
        </div>
        <div style={{ display: "flex", fontSize: view.title.length > 34 ? 60 : 84, fontWeight: 700, lineHeight: 1.08, marginTop: 18, color: "#5B1A4A" }}>{view.title}</div>
        {view.forms.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 26 }}>
            {forms.map((f, i) => (
              <div key={`${f.lang}${i}`} style={{ width: wide ? 344 : 520, height: wide ? 130 : 150, borderRadius: 18, background: TILES[i % TILES.length], color: "#F6EEDC", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 0 rgba(35,31,32,.3)" }}>
                <div style={{ display: "flex", fontSize: f.form.length > 12 ? 34 : f.form.length > 8 ? 44 : 54, lineHeight: 1.1 }}>{f.form}</div>
                <div style={{ display: "flex", fontSize: 22, marginTop: 8, opacity: 0.85 }}>{langName(f.lang)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 24 }}>
            <div style={{ display: "flex", fontSize: 32, lineHeight: 1.35, color: "#3A3430" }}>{view.description}</div>
            {langLine ? <div style={{ display: "flex", fontSize: 28, marginTop: 20, color: "#26428B" }}>{langLine}</div> : null}
            {streak ? <div style={{ display: "flex", fontSize: 28, marginTop: 10, color: "#D9381E" }}>{streak}</div> : null}
            {view.code ? <div style={{ display: "flex", fontSize: 30, marginTop: 14, letterSpacing: 4 }}>{view.code}</div> : null}
          </div>
        )}
        <div style={{ display: "flex", marginTop: "auto", justifyContent: "space-between", fontSize: 28, color: "#5D5650" }}>
          <div style={{ display: "flex" }}>{FOOTER}</div>
          <div style={{ display: "flex" }}>{TAGLINE}</div>
        </div>
      </div>
    ),
    fontSet,
  );
}

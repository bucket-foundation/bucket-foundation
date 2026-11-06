import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import { installHref, isRtl, langName, ogPath, sharePath, shareKind, shareView, type Params } from "@/lib/share";

type Props = { params: Promise<{ kind?: string[] }>; searchParams: Promise<Params> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const kind = shareKind((await params).kind?.[0]);
  const query = await searchParams;
  const view = shareView(kind, query);
  return pageMeta({
    path: sharePath(kind, query),
    title: view.title,
    documentTitle: `${view.title} · Polingual`,
    description: view.description,
    noindex: true,
    image: { url: ogPath(kind, query), width: 1200, height: 630, type: "image/png", alt: `${view.eyebrow}: ${view.title}` },
  });
}

export default async function SharePage({ params, searchParams }: Props) {
  const kind = shareKind((await params).kind?.[0]);
  const view = shareView(kind, await searchParams);
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "56px 16px 96px", color: "#231F20", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <a href="/" style={{ fontSize: 22, fontWeight: 800, color: "#5B1A4A", textDecoration: "none" }}>
        Polingual
      </a>
      <p style={{ fontSize: 13, letterSpacing: 2, textTransform: "uppercase", color: "#5D5650", margin: "32px 0 0" }}>{view.eyebrow}</p>
      <h1 style={{ fontSize: 44, lineHeight: 1.05, margin: "12px 0 20px", color: "#5B1A4A" }}>{view.title}</h1>
      {view.forms.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "grid", gap: 12 }}>
          {view.forms.map((f) => (
            <li key={f.lang} style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
              <span style={{ fontSize: 13, letterSpacing: 1, textTransform: "uppercase", color: "#5D5650", minWidth: 96 }}>{langName(f.lang)}</span>
              <span lang={f.lang} dir={isRtl(f.lang) ? "rtl" : undefined} style={{ fontSize: 30, fontWeight: 800 }}>
                {f.form}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ fontSize: 19, lineHeight: 1.5, margin: "0 0 28px" }}>{view.description}</p>
      )}
      {view.code ? (
        <p style={{ fontSize: 15, margin: "0 0 28px", color: "#5D5650" }}>
          Invite code <strong style={{ fontFamily: "ui-monospace, monospace", letterSpacing: 2, color: "#231F20" }}>{view.code}</strong>. Open this link on your iPhone after you install Polingual to join the group.
        </p>
      ) : null}
      <a href={installHref(kind)} style={{ display: "inline-block", padding: "16px 28px", borderRadius: 999, background: "#5B1A4A", color: "#F6EEDC", fontSize: 18, fontWeight: 800, textDecoration: "none" }}>
        Get Polingual
      </a>
      <p style={{ marginTop: 16, fontSize: 15, color: "#5D5650" }}>Learn several languages at once on iPhone and iPad.</p>
    </main>
  );
}

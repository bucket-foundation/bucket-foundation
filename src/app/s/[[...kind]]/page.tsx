import type { Metadata } from "next";
import { APP_STORE_URL, SHARE_HOST, appleBanner, langName, ogPath, sharePath, shareKind, shareView, type Params } from "@/lib/share/links";

interface Props {
  params: { kind?: string[] };
  searchParams: Params;
}

export const dynamic = "force-dynamic";

export function generateMetadata({ params, searchParams }: Props): Metadata {
  const kind = shareKind(params.kind?.[0]);
  const view = shareView(kind, searchParams);
  const url = SHARE_HOST + sharePath(kind, searchParams);
  const image = { url: ogPath(kind, searchParams), width: 1200, height: 630, alt: view.title };
  return {
    title: view.title,
    description: view.description,
    alternates: { canonical: url },
    robots: { index: false, follow: true },
    openGraph: { title: view.title, description: view.description, url, siteName: "Bucket", type: "website", images: [image] },
    twitter: { card: "summary_large_image", title: view.title, description: view.description, images: [image.url] },
    other: { "apple-itunes-app": appleBanner(url) },
  };
}

export default function SharePage({ params, searchParams }: Props) {
  const kind = shareKind(params.kind?.[0]);
  const view = shareView(kind, searchParams);
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "56px 16px 96px" }}>
      <p style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "#8A6E2E", margin: 0 }}>{view.eyebrow}</p>
      <h1 style={{ fontSize: 44, lineHeight: 1.05, margin: "14px 0 18px" }}>{view.title}</h1>
      {view.forms.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "grid", gap: 12 }}>
          {view.forms.map((f) => (
            <li key={f.lang} style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
              <span style={{ fontSize: 13, letterSpacing: 1, textTransform: "uppercase", color: "#5d5650", minWidth: 88 }}>{langName(f.lang)}</span>
              <span lang={f.lang} style={{ fontSize: 30, fontWeight: 800 }}>{f.form}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ fontSize: 19, lineHeight: 1.5, margin: "0 0 28px" }}>{view.description}</p>
      )}
      {view.code ? (
        <p style={{ fontSize: 15, margin: "0 0 28px", color: "#5d5650" }}>
          Invite code <strong style={{ fontFamily: "ui-monospace, monospace", letterSpacing: 2, color: "#231F20" }}>{view.code}</strong>. Open this link on your iPhone to join in the Bucket app.
        </p>
      ) : null}
      <a
        href={APP_STORE_URL}
        style={{ display: "inline-block", padding: "14px 22px", borderRadius: 999, background: "#3D5E2E", color: "#fff", fontWeight: 700, textDecoration: "none" }}
      >
        Get Bucket on the App Store
      </a>
      <p style={{ marginTop: 18, fontSize: 15 }}>
        <a href="/research-os/learn">Learn on the web</a>
      </p>
    </main>
  );
}

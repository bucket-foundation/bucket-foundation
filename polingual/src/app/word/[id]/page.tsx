// /word/<photon-id> — single photon detail page.
// Fetches from /api/photon/<id> (proxied to bucket.foundation).

import Link from "next/link";
import { notFound } from "next/navigation";

type Photon = {
  id: string; kind: string; lang: string; surface: string;
  meaning_en: string; tier: string; branch: string[];
  pos?: string | null; ipa?: string | null;
  provenance?: { source: string; source_uri: string; captured_at: string };
  relations?: { predicate: string; to: string }[];
};

export const dynamic = "force-dynamic";

async function fetchPhoton(id: string): Promise<Photon | null> {
  // Server-side; we hit the canonical URL directly to avoid the
  // self-referential rewrite loop.
  try {
    const url = `https://www.bucket.foundation/api/photon/${encodeURIComponent(id)}`;
    const r = await fetch(url, { next: { revalidate: 60 } });
    if (!r.ok) return null;
    return (await r.json()) as Photon;
  } catch {
    return null;
  }
}

export default async function WordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photon = await fetchPhoton(decodeURIComponent(id));
  if (!photon) return notFound();

  return (
    <main className="min-h-screen px-4 md:px-8 py-10 md:py-16">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="font-mono text-[10px] uppercase tracking-[0.2em]"
              style={{ color: "var(--sepia-dim)" }}>
          ← polingual
        </Link>
        <header className="mt-6">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="font-mono text-xs uppercase tracking-[0.2em] px-2 py-1 rounded-full"
                  style={{ background: "var(--parchment-2)", color: "var(--sepia)" }}>
              {photon.lang}
            </span>
            <span className="font-mono text-xs italic" style={{ color: "var(--ink-dim)" }}>
              {photon.kind}{photon.pos ? ` · ${photon.pos}` : ""}
            </span>
          </div>
          <h1 className="mt-4 text-5xl md:text-7xl" style={{ color: "var(--ink)" }}>
            {photon.surface}
          </h1>
          {photon.ipa && (
            <p className="mt-2 font-mono text-lg" style={{ color: "var(--sepia)" }}>
              {photon.ipa}
            </p>
          )}
        </header>

        <section className="mt-10">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] mb-3"
              style={{ color: "var(--sepia-dim)" }}>
            meaning · english
          </h2>
          <p className="text-lg leading-relaxed" style={{ color: "var(--ink)" }}>
            {photon.meaning_en}
          </p>
        </section>

        {photon.relations && photon.relations.length > 0 && (
          <section className="mt-10">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] mb-3"
                style={{ color: "var(--sepia-dim)" }}>
              relations
            </h2>
            <ul className="space-y-1.5">
              {photon.relations.map((r, i) => (
                <li key={i} className="font-mono text-sm">
                  <span style={{ color: "var(--sepia)" }}>{r.predicate}</span>
                  <span style={{ color: "var(--ink-dim)" }}> → </span>
                  <Link href={`/word/${encodeURIComponent(r.to)}`}
                        className="underline" style={{ color: "var(--ink)" }}>
                    {r.to}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {photon.provenance && (
          <section className="mt-10 pb-8">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] mb-3"
                style={{ color: "var(--sepia-dim)" }}>
              provenance
            </h2>
            <p className="font-mono text-sm" style={{ color: "var(--ink-dim)" }}>
              {photon.provenance.source}
              {photon.provenance.source_uri && (
                <>
                  {" · "}
                  <a href={photon.provenance.source_uri} target="_blank" rel="noreferrer"
                     className="underline" style={{ color: "var(--burgundy)" }}>
                    source ↗
                  </a>
                </>
              )}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

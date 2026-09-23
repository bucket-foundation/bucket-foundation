import Link from "next/link";
import { notFound } from "next/navigation";
import { getPhoton, type Photon } from "@/lib/photon-db";

export const dynamic = "force-dynamic";

async function fetchPhoton(id: string): Promise<Photon | null> {
  try {
    return await getPhoton(id);
  } catch {
    return null;
  }
}

const LANG_LABEL: Record<string, string> = {
  en: "English",  la: "Latin",      sa: "Sanskrit",   fr: "French",
  de: "German",   es: "Spanish",    it: "Italian",    pt: "Portuguese",
  ru: "Russian",  zh: "Chinese",    ja: "Japanese",   ko: "Korean",
  ar: "Arabic",   he: "Hebrew",     hi: "Hindi",      fa: "Persian",
  el: "Greek",    tr: "Turkish",    pl: "Polish",     nl: "Dutch",
  sv: "Swedish",  fi: "Finnish",    cs: "Czech",      vi: "Vietnamese",
  th: "Thai",     id: "Indonesian", ta: "Tamil",
};

export default async function WordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photon = await fetchPhoton(decodeURIComponent(id));
  if (!photon) return notFound();
  const langLabel = LANG_LABEL[photon.lang] || photon.lang;

  return (
    <main className="min-h-screen">
      <div className="max-w-3xl mx-auto px-5 md:px-8 py-10 md:py-14">
        <Link
          href="/"
          className="inline-flex items-center gap-3 group"
          aria-label="back to polingual"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" width="120" height="48" className="h-9 w-auto opacity-70 group-hover:opacity-100 transition" />
          <span
            className="font-mono text-[10px] uppercase tracking-[0.22em] transition"
            style={{ color: "var(--ink-faint)" }}
          >
            <span style={{ color: "var(--blue)" }}>←</span> back to search
          </span>
        </Link>

        <header
          className="mt-6 rounded-2xl bg-white p-6 md:p-8"
          style={{
            border: `1px solid var(--hairline)`,
            boxShadow: "0 2px 12px -4px rgba(15, 37, 64, 0.08)",
          }}
        >
          <div className="flex items-baseline gap-3 flex-wrap mb-3">
            <span
              className="font-mono text-[10px] uppercase tracking-[0.22em] px-2 py-1 rounded-full"
              style={{ background: "var(--sky-2)", color: "var(--blue)" }}
            >
              {langLabel}
            </span>
            <span
              className="font-mono text-[10px] uppercase tracking-[0.2em]"
              style={{ color: "var(--ink-faint)" }}
            >
              {photon.kind}{photon.pos ? ` · ${photon.pos}` : ""}
            </span>
            <span
              className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-full"
              style={{ background: "var(--sky-2)", color: "var(--ink-dim)" }}
            >
              {photon.tier}
            </span>
          </div>

          <h1
            className="text-[clamp(2.6rem,7vw,5rem)] leading-[1.05]"
            style={{ color: "var(--ink)", letterSpacing: "-0.015em" }}
          >
            {photon.surface}
          </h1>

          {photon.ipa && (
            <p
              className="mt-3 font-mono text-lg md:text-xl"
              style={{ color: "var(--blue)" }}
            >
              /{photon.ipa.replace(/^\/|\/$/g, "")}/
            </p>
          )}
        </header>

        <section className="mt-8">
          <h2
            className="font-mono text-[10px] uppercase tracking-[0.24em] mb-3"
            style={{ color: "var(--blue)" }}
          >
            meaning · english
          </h2>
          <p
            className="text-lg md:text-xl leading-relaxed"
            style={{ color: "var(--ink)" }}
          >
            {photon.meaning_en}
          </p>
        </section>

        {photon.relations && photon.relations.length > 0 && (
          <section className="mt-10">
            <h2
              className="font-mono text-[10px] uppercase tracking-[0.24em] mb-3"
              style={{ color: "var(--blue)" }}
            >
              relations · {photon.relations.length}
            </h2>
            <ul className="space-y-1.5">
              {photon.relations.map((r, i) => (
                <li
                  key={i}
                  className="flex items-baseline gap-3 font-mono text-sm"
                >
                  <span
                    className="font-mono text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full whitespace-nowrap"
                    style={{
                      background: "var(--sky-2)",
                      color: "var(--ink-dim)",
                    }}
                  >
                    {r.predicate}
                  </span>
                  <Link
                    href={`/word/${encodeURIComponent(r.to)}`}
                    className="hover:underline truncate"
                    style={{ color: "var(--blue)" }}
                  >
                    {r.to}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {photon.branch && photon.branch.length > 0 && (
          <section className="mt-10">
            <h2
              className="font-mono text-[10px] uppercase tracking-[0.24em] mb-3"
              style={{ color: "var(--blue)" }}
            >
              canon branches
            </h2>
            <div className="flex flex-wrap gap-2">
              {photon.branch.map((b) => (
                <span
                  key={b}
                  className="font-mono text-[10px] uppercase tracking-[0.18em] px-3 py-1.5 rounded-full"
                  style={{
                    background: "var(--sky-2)",
                    color: "var(--ink-2)",
                    border: `1px solid var(--hairline)`,
                  }}
                >
                  {b}
                </span>
              ))}
            </div>
          </section>
        )}

        {photon.provenance && (
          <section className="mt-10 pb-12">
            <h2
              className="font-mono text-[10px] uppercase tracking-[0.24em] mb-3"
              style={{ color: "var(--ink-faint)" }}
            >
              provenance
            </h2>
            <p className="font-mono text-sm" style={{ color: "var(--ink-dim)" }}>
              <span style={{ color: "var(--ink-2)" }}>
                {photon.provenance.source}
              </span>
              {photon.provenance.source_uri && (
                <>
                  {" · "}
                  <a
                    href={photon.provenance.source_uri}
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:no-underline"
                    style={{ color: "var(--blue)" }}
                  >
                    source ↗
                  </a>
                </>
              )}
              {photon.provenance.captured_at && (
                <>
                  {" · "}
                  <span style={{ color: "var(--ink-faint)" }}>
                    captured {photon.provenance.captured_at.slice(0, 10)}
                  </span>
                </>
              )}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

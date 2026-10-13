import Link from "next/link";
import type { Metadata } from "next";
import Script from "next/script";
import { TOOLS, type Tool } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Research tools · run real instruments",
  description:
    `${TOOLS.length} free research instruments on bucket.foundation: protein stability, ADMET screening, RNA folding, ephys fits, imaging, causal design, power analysis and literature tools over live OpenAlex. Run them on your input. The reader pays nothing.`,
  alternates: { canonical: "/research/tools" },
  openGraph: {
    type: "website",
    url: "https://www.bucket.foundation/research/tools",
    title: `${TOOLS.length} free research tools · bucket.foundation`,
    description:
      "Research instruments across fields, from protein and RNA to causal design and live literature search. Free to run.",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TOOLS.length} free research tools · bucket.foundation`,
    description:
      "Research instruments across biophysics, causal design, materials, statistics, earth science and machine learning. Free to run.",
  },
};

const TOOLS_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  "@id": "https://www.bucket.foundation/research/tools#list",
  name: "bucket.foundation research tools",
  description:
    "Free research instruments served through bucket.foundation.",
  numberOfItems: TOOLS.length,
  itemListElement: TOOLS.map((t, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: `https://www.bucket.foundation/research/tools/${t.slug}`,
    name: t.name,
  })),
};


export default function Page() {
  return (
    <main className="stone-bone relative grain">
      <Script
        id="ld-tools"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(TOOLS_JSON_LD) }}
      />
      <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-14 md:py-32">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          § Research · tools
        </div>
        <h1 className="font-display uppercase text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          run real{" "}
          <span className="inlay-gold">instruments.</span>
        </h1>
        <p className="mt-7 text-[17px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          {TOOLS.length} tools, each running real logic on your input. Run one,
          read the result, and request canon review. Accepted results enter the
          canon and pay their author on each paid citation.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-10 overflow-hidden border border-[color:var(--hairline)] bg-[color:var(--bone)]">
          <table className="w-full text-left border-collapse">
            <caption className="sr-only">Research tools</caption>
            <thead>
              <tr className="border-b border-[color:var(--hairline)] text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
                <th scope="col" className="p-4 md:px-6 font-normal w-[40%] md:w-[28%]">
                  Tool
                </th>
                <th scope="col" className="p-4 md:px-6 font-normal">
                  What it does
                </th>
              </tr>
            </thead>
            <tbody>
              {TOOLS.map((t) => (
                <ToolRow key={t.slug} tool={t} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function ToolRow({ tool }: { tool: Tool }) {
  return (
    <tr className="border-b border-[color:var(--hairline)] last:border-b-0 align-top">
      <th scope="row" className="p-4 md:px-6 font-normal">
        <Link
          href={`/research/tools/${tool.slug}`}
          className="font-display uppercase text-[16px] tracking-[0.04em] text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
        >
          {tool.name}
        </Link>
        <div className="mt-1 text-[10px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
          {tool.klass} · {tool.status === "live" ? "live" : "demo"}
        </div>
      </th>
      <td className="p-4 md:px-6 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
        {tool.blurb}
      </td>
    </tr>
  );
}

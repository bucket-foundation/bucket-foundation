import Link from "next/link";
import Script from "next/script";
import { toolMetadata, toolJsonLd } from "@/lib/tools";

export const metadata = toolMetadata("grantdraft");
const _jsonld = toolJsonLd("grantdraft");
import GrantDraftClient from "./GrantDraftClient";

// GrantDraft run page, corpus-grounded funder finder + specific-aims drafter.
export default function Page() {
  return (
    <main className="stone-bone relative grain">
      {_jsonld && (
        <Script
          id="ld-tool-grantdraft"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(_jsonld) }}
        />
      )}
      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-14 md:py-32">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          <Link
            href="/research/tools"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)]"
          >
            § Research · tools
          </Link>{" "}
          / GrantDraft
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          draft aims grounded in{" "}
          <span className="inlay-gold">real awards.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Name your research topic. GrantDraft searches the research-atlas corpus
          of real awarded NSF grants (with an OpenAlex literature fallback), shows
          you which programs fund the area, and drafts specific-aims bullets
          anchored to the actual awards they extend — defensible, not generic.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <GrantDraftClient />
        </div>
      </div>
    </main>
  );
}

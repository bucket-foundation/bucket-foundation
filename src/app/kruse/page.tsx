import Link from "next/link";

// Public preview. The gated interactive search lives at /kruse/search and is
// only reachable with a valid HS256 magic-link cookie (see middleware.ts).
export const dynamic = "force-static";

export default function KrusePage() {
  return (
    <main className="stone-bone relative grain">
      <div className="max-w-[1100px] mx-auto px-6 py-24 md:py-32">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          § Bucket Foundation · Private preview
        </div>
        <h1 className="font-display uppercase text-[clamp(2.1rem,5.2vw,3.9rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          the kruse index.
        </h1>
        <p className="mt-7 text-[18px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          460 articles. Three retrieval modes. One search bar. A private
          preview built for Dr. Jack Kruse by Bucket Foundation, demonstrating
          what a foundation-aligned longevity index looks like when it is
          hybrid-searched, chunk-indexed, and citeable over feed402.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-px bg-[color:var(--hairline)] grid-hairlines">
          <Tile
            tag="keyword"
            body="FTS5 across titles, bodies, and footnotes. Returns exact-phrase hits with snippets."
          />
          <Tile
            tag="semantic"
            body="MiniLM-L6-v2 embeddings over chunked articles. Finds concepts the words never quite name."
          />
          <Tile
            tag="hybrid"
            body="Reciprocal-rank fusion. The one you actually want."
          />
        </div>

        <section className="mt-16">
          <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-4">
            § Access
          </div>
          <p className="text-[15px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
            Access is by magic link only during the private preview. If you
            have a link, paste it in your browser — your cookie is set and you
            land in the search. If you do not, reach out to the founder at{" "}
            <a
              href="mailto:gian@bucket.foundation"
              className="text-[color:var(--aegean-deep)] underline decoration-[color:var(--gold)] underline-offset-4"
            >
              gian@bucket.foundation
            </a>
            .
          </p>
          <p className="mt-4 text-[13px] leading-[1.75] text-[color:var(--basalt-3)] max-w-2xl">
            Data &copy; Dr. Jack Kruse ·{" "}
            <a
              href="https://jackkruse.com"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-[color:var(--gold)] underline-offset-4 hover:text-[color:var(--basalt)]"
            >
              jackkruse.com
            </a>
            . Citation-only; full text lives at the author&rsquo;s site.
          </p>
        </section>

        <div className="mt-14 flex flex-wrap gap-x-6 gap-y-3 text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
          <Link
            href="/canon"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            the canon
          </Link>
          <Link
            href="/protocol/envelope"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            envelope spec
          </Link>
          <Link
            href="/cite-forever/v0.1"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)] underline decoration-[color:var(--gold)] underline-offset-4"
          >
            cite-forever v0.1
          </Link>
        </div>
      </div>
    </main>
  );
}

function Tile({ tag, body }: { tag: string; body: string }) {
  return (
    <div className="bg-[color:var(--bone)] p-7 md:p-8 flex flex-col gap-3 min-h-[170px] shadow-[inset_0_1px_0_rgba(239,232,212,0.6),inset_0_-1px_0_rgba(31,28,22,0.18)]">
      <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--gold-deep)]">
        {tag}
      </div>
      <div className="w-8 h-0.5 bg-[color:var(--gold)]" />
      <p className="text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">
        {body}
      </p>
    </div>
  );
}

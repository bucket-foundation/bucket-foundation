import KruseSearch from "../_components/KruseSearch";

// Gated by middleware.ts — this route is unreachable without a valid
// HS256 cookie. Never prerendered or cached.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function KruseSearchPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-16 md:px-8 md:pt-24">
      <header className="mb-10 md:mb-14">
        <p
          className="mb-5 text-xs uppercase tracking-[0.22em]"
          style={{ color: "#9a968c", fontFamily: "var(--font-jetbrains)" }}
        >
          Bucket Foundation · Private Preview
        </p>
        <h1
          className="text-[2.1rem] leading-[1.1] md:text-[3.1rem] md:leading-[1.05]"
          style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500 }}
        >
          The Kruse Index
        </h1>
        <p
          className="mt-4 text-lg md:text-xl"
          style={{ color: "#bdb7ac", fontFamily: "var(--font-fraunces)" }}
        >
          460 articles, three retrieval modes, one search bar.
        </p>
        <p
          className="mt-2 text-sm md:text-base"
          style={{
            color: "#8a867c",
            fontFamily: "var(--font-fraunces)",
            fontStyle: "italic",
          }}
        >
          A private preview built for Dr. Jack Kruse by Bucket Foundation.
        </p>
      </header>

      <KruseSearch />

      <footer
        className="mt-20 border-t pt-6 text-xs leading-relaxed"
        style={{
          borderColor: "#1c1f22",
          color: "#7a7669",
          fontFamily: "var(--font-jetbrains)",
        }}
      >
        <p>Private preview. Built by Bucket Foundation for Dr. Jack Kruse.</p>
        <p className="mt-1">
          Data &copy; Dr. Jack Kruse &middot;{" "}
          <a
            href="https://jackkruse.com"
            target="_blank"
            rel="noreferrer"
            className="underline hover:opacity-80"
          >
            jackkruse.com
          </a>
          . This URL is yours alone.
        </p>
      </footer>
    </main>
  );
}
